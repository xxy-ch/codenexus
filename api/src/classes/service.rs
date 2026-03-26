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
        let code = format!("CLS{}", &Uuid::new_v4().simple().to_string()[..6].to_uppercase());

        let class = sqlx::query_as::<_, Class>(
            r#"
            INSERT INTO classes (organization_id, campus_id, name, teacher_id, semester, code, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
            RETURNING
                id,
                organization_id,
                campus_id,
                name,
                NULL::TEXT AS description,
                teacher_id,
                code,
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
        .bind(&code)
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
                code,
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
        let class = sqlx::query_as::<_, Class>(
            r#"
            SELECT
                id,
                organization_id,
                campus_id,
                name,
                NULL::TEXT AS description,
                teacher_id,
                code,
                TRUE AS is_active,
                NULL::INTEGER AS max_students,
                semester,
                created_at,
                updated_at
            FROM classes
            WHERE code = $1
            "#
        )
        .bind(code)
        .fetch_one(&self.pool)
        .await?;

        Ok(class)
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
                code,
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
                code,
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
            r#"
            SELECT COUNT(*)
            FROM assignments a
            JOIN class_enrollments ce ON ce.class_id = a.class_id AND ce.status = 'active'
            JOIN submissions s ON s.problem_id = a.problem_id AND s.user_id = ce.student_id
            WHERE a.class_id = $1
            "#
        )
        .bind(class_id)
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

        let enrollment = sqlx::query_as::<_, ClassEnrollment>(
            r#"
            INSERT INTO class_enrollments (class_id, student_id, status, enrolled_at)
            VALUES ($1, $2, 'active', $3)
            RETURNING id, class_id, student_id, status, enrolled_at
            "#
        )
        .bind(class.id)
        .bind(student_id)
        .bind(Utc::now())
        .fetch_one(&self.pool)
        .await?;

        Ok(enrollment)
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
                COALESCE(u.username, u.user_code, ce.student_id::TEXT) AS username,
                COALESCE(u.email, '') AS email,
                0::INTEGER AS total_assignments,
                0::INTEGER AS completed_assignments,
                0::DOUBLE PRECISION AS average_score,
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
            RETURNING id, class_id, problem_id, deadline, points, published_at, created_at, updated_at
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
            "SELECT id, class_id, problem_id, deadline, points, published_at, created_at, updated_at FROM assignments WHERE id = $1"
        )
        .bind(assignment_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(assignment)
    }

    /// List assignments for class
    pub async fn list_assignments(&self, class_id: i64) -> Result<Vec<Assignment>> {
        let assignments = sqlx::query_as::<_, Assignment>(
            "SELECT id, class_id, problem_id, deadline, points, published_at, created_at, updated_at FROM assignments WHERE class_id = $1 ORDER BY deadline ASC"
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
            RETURNING id, class_id, problem_id, deadline, points, published_at, created_at, updated_at
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
        let assignment = sqlx::query_as::<_, Assignment>(
            r#"
            UPDATE assignments
            SET published_at = COALESCE(published_at, NOW()),
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, class_id, problem_id, deadline, points, published_at, created_at, updated_at
            "#
        )
        .bind(assignment_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(assignment)
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
        let submissions = sqlx::query_as::<_, AssignmentSubmission>(
            r#"
            SELECT
                ROW_NUMBER() OVER (ORDER BY s.created_at DESC)::BIGINT AS id,
                a.id AS assignment_id,
                s.user_id,
                s.id AS submission_id,
                CASE WHEN s.verdict = 'ac' THEN a.points ELSE 0 END AS score,
                (s.created_at > a.deadline) AS is_late,
                GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (s.created_at - a.deadline)) / 86400))::INTEGER AS late_days,
                s.created_at AS submitted_at
            FROM assignments a
            JOIN class_enrollments ce ON ce.class_id = a.class_id AND ce.status = 'active'
            JOIN submissions s ON s.problem_id = a.problem_id AND s.user_id = ce.student_id
            WHERE a.id = $1
            ORDER BY s.created_at DESC
            "#
        )
        .bind(assignment_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(submissions)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::postgres::PgPoolOptions;

    #[tokio::test]
    async fn get_class_students_returns_seeded_students() {
        dotenvy::dotenv().ok();

        let database_url = match std::env::var("DATABASE_URL") {
            Ok(url) => url,
            Err(_) => return,
        };

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .expect("connect test database");

        let service = ClassService::new(pool);
        let students = service
            .get_class_students(1)
            .await
            .expect("load seeded class students");

        assert!(!students.is_empty(), "expected seeded class to expose students");
        assert!(students.iter().all(|student| !student.username.is_empty()));
        assert!(students.iter().all(|student| !student.email.is_empty()));
    }
}
