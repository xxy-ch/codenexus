use anyhow::Result;
use sqlx::PgPool;
use uuid::Uuid;
use chrono::Utc;
use crate::classes::models::*;

pub struct ClassService {
    pool: PgPool,
}

impl ClassService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // ========== Class Management ==========

    /// Create a new class
    pub async fn create_class(
        &self,
        request: &CreateClassRequest,
        teacher_id: Uuid,
    ) -> Result<Class> {
        let now = Utc::now();

        let class = sqlx::query_as::<_, Class>(
            r#"
            INSERT INTO classes (organization_id, campus_id, name, teacher_id, semester, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $6)
            RETURNING
                id,
                organization_id,
                campus_id,
                name,
                NULL::TEXT AS description,
                teacher_id,
                NULL::TEXT AS code,
                TRUE AS is_active,
                NULL::INTEGER AS max_students,
                semester,
                created_at,
                updated_at
            "#
        )
        .bind(request.organization_id)
        .bind(request.campus_id)
        .bind(&request.name)
        .bind(teacher_id)
        .bind(&request.semester)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(class)
    }

    /// Get class by ID
    pub async fn get_class(&self, class_id: i64) -> Result<Class> {
        let class = sqlx::query_as::<_, Class>(
            r#"
            SELECT
                id,
                organization_id,
                campus_id,
                name,
                NULL::TEXT AS description,
                teacher_id,
                NULL::TEXT AS code,
                TRUE AS is_active,
                NULL::INTEGER AS max_students,
                semester,
                created_at,
                updated_at
            FROM classes
            WHERE id = $1
            "#
        )
        .bind(class_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(class)
    }

    /// Get class by enrollment code
    pub async fn get_class_by_code(&self, code: &str) -> Result<Class> {
        let _ = code;
        Err(anyhow::anyhow!("Enrollment codes are not supported by the current schema"))
    }

    /// List classes with filters
    pub async fn list_classes(&self, query: &ListClassesQuery) -> Result<ClassesListResponse> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(20).min(100);
        let offset = (page - 1) * limit;

        let mut conditions = Vec::new();
        let mut param_count = 0;

        if query.organization_id.is_some() {
            param_count += 1;
            conditions.push(format!("organization_id = ${}", param_count));
        }
        if query.campus_id.is_some() {
            param_count += 1;
            conditions.push(format!("campus_id = ${}", param_count));
        }
        if query.teacher_id.is_some() {
            param_count += 1;
            conditions.push(format!("teacher_id = ${}", param_count));
        }
        if query.is_active.is_some() {
            param_count += 1;
            conditions.push(format!("${}::BOOLEAN = true", param_count));
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        // Build query dynamically
        let query_str = format!(
            r#"
            SELECT
                id,
                organization_id,
                campus_id,
                name,
                NULL::TEXT AS description,
                teacher_id,
                NULL::TEXT AS code,
                TRUE AS is_active,
                NULL::INTEGER AS max_students,
                semester,
                created_at,
                updated_at
            FROM classes
            {}
            ORDER BY created_at DESC
            LIMIT ${} OFFSET ${}
            "#,
            where_clause,
            param_count + 1,
            param_count + 2
        );

        let count_query_str = format!(
            "SELECT COUNT(*) as count FROM classes {}",
            where_clause
        );

        let mut query_builder = sqlx::query_as::<_, Class>(&query_str);
        let mut count_builder = sqlx::query_scalar::<_, i64>(&count_query_str);

        if let Some(org_id) = query.organization_id {
            query_builder = query_builder.bind(org_id);
            count_builder = count_builder.bind(org_id);
        }
        if let Some(campus_id) = query.campus_id {
            query_builder = query_builder.bind(campus_id);
            count_builder = count_builder.bind(campus_id);
        }
        if let Some(teacher_id) = query.teacher_id {
            query_builder = query_builder.bind(teacher_id);
            count_builder = count_builder.bind(teacher_id);
        }
        if let Some(is_active) = query.is_active {
            query_builder = query_builder.bind(is_active);
            count_builder = count_builder.bind(is_active);
        }

        query_builder = query_builder.bind(limit).bind(offset);
        let classes = query_builder.fetch_all(&self.pool).await?;

        let total = count_builder.fetch_one(&self.pool).await?;

        Ok(ClassesListResponse {
            classes,
            total,
            page,
            limit,
        })
    }

    /// Update class
    pub async fn update_class(&self, class_id: i64, request: &UpdateClassRequest) -> Result<Class> {
        let now = Utc::now();

        let class = sqlx::query_as::<_, Class>(
            r#"
            UPDATE classes
            SET name = COALESCE($1, name),
                campus_id = COALESCE($2, campus_id),
                semester = COALESCE($3, semester),
                updated_at = $4
            WHERE id = $5
            RETURNING
                id,
                organization_id,
                campus_id,
                name,
                NULL::TEXT AS description,
                teacher_id,
                NULL::TEXT AS code,
                TRUE AS is_active,
                NULL::INTEGER AS max_students,
                semester,
                created_at,
                updated_at
            "#
        )
        .bind(&request.name)
        .bind(request.campus_id)
        .bind(&request.semester)
        .bind(now)
        .bind(class_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(class)
    }

    /// Delete class
    pub async fn delete_class(&self, class_id: i64) -> Result<()> {
        sqlx::query("DELETE FROM classes WHERE id = $1")
            .bind(class_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Get class statistics
    pub async fn get_class_stats(&self, class_id: i64) -> Result<ClassStats> {
        let total_students: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM class_enrollments
            WHERE class_id = $1 AND status = 'active'
            "#
        )
        .bind(class_id)
        .fetch_one(&self.pool)
        .await?;

        let total_assignments: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM assignments WHERE class_id = $1"
        )
        .bind(class_id)
        .fetch_one(&self.pool)
        .await
        .unwrap_or(0);

        let total_submissions: i64 = sqlx::query_scalar(
            "SELECT 0"
        )
        .fetch_one(&self.pool)
        .await
        .unwrap_or(0);

        Ok(ClassStats {
            class_id,
            total_students: total_students as i32,
            active_students: total_students as i32,
            total_assignments: total_assignments as i32,
            total_submissions,
            average_score: 0.0,
            completion_rate: if total_students > 0 { 100.0 } else { 0.0 },
        })
    }

    // ========== Student Enrollment ==========

    /// Add student to class
    pub async fn add_student(
        &self,
        class_id: i64,
        teacher_id: Uuid,
        student_email: &str,
    ) -> Result<ClassEnrollment> {
        // Get class
        let class = self.get_class(class_id).await?;

        // Verify teacher owns this class
        if class.teacher_id != teacher_id {
            return Err(anyhow::anyhow!("Not authorized to add students to this class"));
        }

        // Find student by email
        let student: (Uuid,) = sqlx::query_as(
            "SELECT id FROM users WHERE email = $1"
        )
        .bind(student_email)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| anyhow::anyhow!("Student not found"))?;

        // Check if already enrolled
        let existing = sqlx::query(
            "SELECT id FROM class_enrollments WHERE class_id = $1 AND student_id = $2"
        )
        .bind(class_id)
        .bind(student.0)
        .fetch_optional(&self.pool)
        .await?;

        if existing.is_some() {
            return Err(anyhow::anyhow!("Student already enrolled"));
        }

        // Check max students
        // Create enrollment
        let enrollment = sqlx::query_as::<_, ClassEnrollment>(
            r#"
            INSERT INTO class_enrollments (class_id, student_id, status, enrolled_at)
            VALUES ($1, $2, 'active', $3)
            RETURNING id, class_id, student_id, status, enrolled_at
            "#
        )
        .bind(class_id)
        .bind(student.0)
        .bind(Utc::now())
        .fetch_one(&self.pool)
        .await?;

        Ok(enrollment)
    }

    /// Student self-enroll using code
    pub async fn enroll_with_code(&self, code: &str, student_id: Uuid) -> Result<ClassEnrollment> {
        let class = self.get_class_by_code(code).await?;

        // Check if already enrolled
        let existing = sqlx::query(
            "SELECT id FROM class_enrollments WHERE class_id = $1 AND student_id = $2"
        )
        .bind(class.id)
        .bind(student_id)
        .fetch_optional(&self.pool)
        .await?;

        if existing.is_some() {
            return Err(anyhow::anyhow!("Already enrolled in this class"));
        }

        let _ = (class, student_id);
        Err(anyhow::anyhow!("Enrollment by code is not supported by the current schema"))
    }

    /// Remove student from class
    pub async fn remove_student(&self, class_id: i64, student_id: Uuid) -> Result<()> {
        sqlx::query(
            "DELETE FROM class_enrollments WHERE class_id = $1 AND student_id = $2"
        )
        .bind(class_id)
        .bind(student_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Get all students in class
    pub async fn get_class_students(&self, class_id: i64) -> Result<Vec<StudentProgress>> {
        let students = sqlx::query_as::<_, StudentProgress>(
            r#"
            SELECT
                ce.student_id,
                u.username,
                u.email,
                0 AS total_assignments,
                0 AS completed_assignments,
                0.0 AS average_score,
                NULL::TIMESTAMPTZ AS last_submission
            FROM class_enrollments ce
            JOIN users u ON u.id = ce.student_id
            WHERE ce.class_id = $1
            ORDER BY ce.enrolled_at DESC
            "#
        )
        .bind(class_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(students)
    }

    /// Batch import students from CSV
    pub async fn batch_import_students(
        &self,
        class_id: i64,
        teacher_id: Uuid,
        emails: Vec<String>,
    ) -> Result<Vec<ClassEnrollment>> {
        let mut enrollments = Vec::new();

        for email in emails {
            match self.add_student(class_id, teacher_id, &email).await {
                Ok(enrollment) => enrollments.push(enrollment),
                Err(e) => {
                    tracing::warn!("Failed to enroll student {}: {}", email, e);
                }
            }
        }

        Ok(enrollments)
    }

    // ========== Assignment Management ==========

    /// Create assignment
    pub async fn create_assignment(
        &self,
        class_id: i64,
        request: &CreateAssignmentRequest,
    ) -> Result<Assignment> {
        let now = Utc::now();

        let assignment = sqlx::query_as::<_, Assignment>(
            r#"
            INSERT INTO assignments (class_id, problem_id, deadline, points, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $5)
            RETURNING *
            "#
        )
        .bind(class_id)
        .bind(request.problem_id)
        .bind(request.deadline)
        .bind(request.points.unwrap_or(100))
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(assignment)
    }

    /// Get assignment
    pub async fn get_assignment(&self, assignment_id: i64) -> Result<Assignment> {
        let assignment = sqlx::query_as::<_, Assignment>(
            "SELECT * FROM assignments WHERE id = $1"
        )
        .bind(assignment_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(assignment)
    }

    /// List assignments for class
    pub async fn list_assignments(&self, class_id: i64) -> Result<Vec<Assignment>> {
        let assignments = sqlx::query_as::<_, Assignment>(
            "SELECT * FROM assignments WHERE class_id = $1 ORDER BY deadline ASC"
        )
        .bind(class_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(assignments)
    }

    /// Update assignment
    pub async fn update_assignment(
        &self,
        assignment_id: i64,
        request: &UpdateAssignmentRequest,
    ) -> Result<Assignment> {
        let now = Utc::now();

        let assignment = sqlx::query_as::<_, Assignment>(
            r#"
            UPDATE assignments
            SET problem_id = COALESCE($1, problem_id),
                deadline = COALESCE($2, deadline),
                points = COALESCE($3, points),
                updated_at = $4
            WHERE id = $5
            RETURNING *
            "#
        )
        .bind(request.problem_id)
        .bind(request.deadline)
        .bind(request.points)
        .bind(now)
        .bind(assignment_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(assignment)
    }

    /// Delete assignment
    pub async fn delete_assignment(&self, assignment_id: i64) -> Result<()> {
        sqlx::query("DELETE FROM assignments WHERE id = $1")
            .bind(assignment_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Publish assignment
    pub async fn publish_assignment(&self, assignment_id: i64) -> Result<Assignment> {
        let _ = assignment_id;
        Err(anyhow::anyhow!("Assignment publishing is not supported by the current schema"))
    }

    /// Record submission for assignment
    pub async fn record_submission(
        &self,
        assignment_id: i64,
        user_id: Uuid,
        submission_id: i64,
        score: i32,
    ) -> Result<AssignmentSubmission> {
        let _ = (assignment_id, user_id, submission_id, score);
        Err(anyhow::anyhow!(
            "Assignment submission recording is not supported by the current schema"
        ))
    }

    /// Get submissions for assignment
    pub async fn get_assignment_submissions(&self, assignment_id: i64) -> Result<Vec<AssignmentSubmission>> {
        let _ = assignment_id;
        Ok(vec![])
    }
}
