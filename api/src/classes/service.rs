use anyhow::Result;
use sqlx::{PgPool, Row};
use uuid::Uuid;
use chrono::Utc;
use crate::classes::models::*;
use std::collections::HashMap;

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
        // Generate unique enrollment code (6-character uppercase)
        let code = generate_enrollment_code();
        let now = Utc::now();

        let class = sqlx::query_as::<_, Class>(
            r#"
            INSERT INTO classes (organization_id, campus_id, name, description, teacher_id, code, is_active, max_students, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $8)
            RETURNING *
            "#
        )
        .bind(request.organization_id)
        .bind(request.campus_id)
        .bind(&request.name)
        .bind(&request.description)
        .bind(teacher_id)
        .bind(&code)
        .bind(request.max_students)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(class)
    }

    /// Get class by ID
    pub async fn get_class(&self, class_id: i64) -> Result<Class> {
        let class = sqlx::query_as::<_, Class>(
            "SELECT * FROM classes WHERE id = $1"
        )
        .bind(class_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(class)
    }

    /// Get class by enrollment code
    pub async fn get_class_by_code(&self, code: &str) -> Result<Class> {
        let class = sqlx::query_as::<_, Class>(
            "SELECT * FROM classes WHERE code = $1 AND is_active = true"
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
            conditions.push(format!("is_active = ${}", param_count));
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        // Build query dynamically
        let query_str = format!(
            "SELECT * FROM classes {} ORDER BY created_at DESC LIMIT ${} OFFSET ${}",
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
                description = COALESCE($2, description),
                is_active = COALESCE($3, is_active),
                max_students = COALESCE($4, max_students),
                updated_at = $5
            WHERE id = $6
            RETURNING *
            "#
        )
        .bind(&request.name)
        .bind(&request.description)
        .bind(request.is_active)
        .bind(request.max_students)
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
        let stats = sqlx::query_as::<_, ClassStats>(
            r#"
            SELECT
                class_id,
                total_students,
                active_students,
                total_assignments,
                total_submissions,
                average_score,
                completion_rate
            FROM class_statistics($1)
            "#
        )
        .bind(class_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(stats)
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
        if let Some(max) = class.max_students {
            let current_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM class_enrollments WHERE class_id = $1 AND status = 'active'"
            )
            .bind(class_id)
            .fetch_one(&self.pool)
            .await?;

            if current_count >= max as i64 {
                return Err(anyhow::anyhow!("Class has reached maximum capacity"));
            }
        }

        // Create enrollment
        let enrollment = sqlx::query_as::<_, ClassEnrollment>(
            r#"
            INSERT INTO class_enrollments (class_id, student_id, teacher_id, status, enrolled_at, updated_at)
            VALUES ($1, $2, $3, 'active', $4, $4)
            RETURNING *
            "#
        )
        .bind(class_id)
        .bind(student.0)
        .bind(teacher_id)
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

        // Check max students
        if let Some(max) = class.max_students {
            let current_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM class_enrollments WHERE class_id = $1 AND status = 'active'"
            )
            .bind(class.id)
            .fetch_one(&self.pool)
            .await?;

            if current_count >= max as i64 {
                return Err(anyhow::anyhow!("Class has reached maximum capacity"));
            }
        }

        // Create enrollment
        let enrollment = sqlx::query_as::<_, ClassEnrollment>(
            r#"
            INSERT INTO class_enrollments (class_id, student_id, teacher_id, status, enrolled_at, updated_at)
            VALUES ($1, $2, $3, 'active', $4, $4)
            RETURNING *
            "#
        )
        .bind(class.id)
        .bind(student_id)
        .bind(class.teacher_id)
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
                s.student_id,
                u.username,
                u.email,
                s.total_assignments,
                s.completed_assignments,
                s.average_score,
                s.last_submission
            FROM student_progress s
            JOIN users u ON u.id = s.student_id
            WHERE s.class_id = $1
            ORDER BY s.completed_assignments DESC, s.average_score DESC
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
            INSERT INTO assignments (class_id, title, description, problem_ids, deadline, late_penalty_percent, max_submissions, is_published, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, $8)
            RETURNING *
            "#
        )
        .bind(class_id)
        .bind(&request.title)
        .bind(&request.description)
        .bind(&request.problem_ids)
        .bind(request.deadline)
        .bind(request.late_penalty_percent)
        .bind(request.max_submissions)
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
            SET title = COALESCE($1, title),
                description = COALESCE($2, description),
                problem_ids = COALESCE($3, problem_ids),
                deadline = COALESCE($4, deadline),
                late_penalty_percent = COALESCE($5, late_penalty_percent),
                max_submissions = COALESCE($6, max_submissions),
                is_published = COALESCE($7, is_published),
                updated_at = $8
            WHERE id = $9
            RETURNING *
            "#
        )
        .bind(&request.title)
        .bind(&request.description)
        .bind(&request.problem_ids)
        .bind(request.deadline)
        .bind(request.late_penalty_percent)
        .bind(request.max_submissions)
        .bind(request.is_published)
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
        let now = Utc::now();

        let assignment = sqlx::query_as::<_, Assignment>(
            "UPDATE assignments SET is_published = true, updated_at = $2 WHERE id = $1 RETURNING *"
        )
        .bind(assignment_id)
        .bind(now)
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
        // Get assignment
        let assignment = self.get_assignment(assignment_id).await?;

        // Calculate late penalty
        let now = Utc::now();
        let is_late = now > assignment.deadline;
        let late_days = if is_late {
            let duration = now.signed_duration_since(assignment.deadline);
            duration.num_days() as i32
        } else {
            0
        };

        // Apply penalty
        let final_score = if is_late {
            let penalty = (late_days as i32 * assignment.late_penalty_percent).min(100);
            score * (100 - penalty) / 100
        } else {
            score
        };

        let submission = sqlx::query_as::<_, AssignmentSubmission>(
            r#"
            INSERT INTO assignment_submissions (assignment_id, user_id, submission_id, score, is_late, late_days, submitted_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            "#
        )
        .bind(assignment_id)
        .bind(user_id)
        .bind(submission_id)
        .bind(final_score)
        .bind(is_late)
        .bind(late_days)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(submission)
    }

    /// Get submissions for assignment
    pub async fn get_assignment_submissions(&self, assignment_id: i64) -> Result<Vec<AssignmentSubmission>> {
        let submissions = sqlx::query_as::<_, AssignmentSubmission>(
            "SELECT * FROM assignment_submissions WHERE assignment_id = $1 ORDER BY submitted_at DESC"
        )
        .bind(assignment_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(submissions)
    }
}

/// Generate random enrollment code
fn generate_enrollment_code() -> String {
    use rand::Rng;
    const CHARSET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1 to avoid confusion
    let mut rng = rand::thread_rng();
    (0..6)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}
