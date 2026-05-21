use crate::models::*;
use anyhow::Result;
use api_infra::error::AppError;
use api_infra::traits::class_repo::ClassMembershipChecker;
use async_trait::async_trait;
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

pub struct ClassService {
    pool: PgPool,
}

impl ClassService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// SECURITY: Verify that a campus belongs to the given organization.
    /// Defense-in-depth to prevent cross-org writes even if JWT claims are inconsistent.
    pub async fn verify_campus_org(
        &self,
        campus_id: i64,
        org_id: i64,
    ) -> Result<(), anyhow::Error> {
        let row: Option<(i64,)> =
            sqlx::query_as("SELECT 1 FROM campuses WHERE id = $1 AND organization_id = $2")
                .bind(campus_id)
                .bind(org_id)
                .fetch_optional(&self.pool)
                .await?;
        if row.is_none() {
            anyhow::bail!(
                "Campus {} does not belong to organization {}",
                campus_id,
                org_id
            );
        }
        Ok(())
    }

    // ========== Grade Management ==========

    /// Create a new grade for a campus
    pub async fn create_grade(&self, request: &CreateGradeRequest) -> Result<Grade> {
        let grade = sqlx::query_as::<_, Grade>(
            r#"
            INSERT INTO grades (campus_id, name, year_level, academic_year)
            VALUES ($1, $2, $3, $4)
            RETURNING id, campus_id, name, year_level, academic_year, is_active, created_at, updated_at
            "#,
        )
        .bind(request.campus_id)
        .bind(&request.name)
        .bind(request.year_level)
        .bind(&request.academic_year)
        .fetch_one(&self.pool)
        .await?;

        Ok(grade)
    }

    /// Get grade by ID
    pub async fn get_grade(&self, grade_id: i64) -> Result<Grade> {
        let grade = sqlx::query_as::<_, Grade>(
            r#"
            SELECT id, campus_id, name, year_level, academic_year, is_active, created_at, updated_at
            FROM grades
            WHERE id = $1
            "#,
        )
        .bind(grade_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(grade)
    }

    /// List grades with filters
    pub async fn list_grades(&self, query: &ListGradesQuery) -> Result<GradesListResponse> {
        let mut conditions = Vec::new();
        let mut param_count = 0;

        if query.campus_id.is_some() {
            param_count += 1;
            conditions.push(format!("campus_id = ${}", param_count));
        }
        if query.is_active.is_some() {
            param_count += 1;
            conditions.push(format!("is_active = ${}", param_count));
        }
        if query.academic_year.is_some() {
            param_count += 1;
            conditions.push(format!("academic_year = ${}", param_count));
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        let query_str = format!(
            r#"
            SELECT id, campus_id, name, year_level, academic_year, is_active, created_at, updated_at
            FROM grades
            {}
            ORDER BY year_level ASC, name ASC
            "#,
            where_clause,
        );

        let count_query_str = format!("SELECT COUNT(*) FROM grades {}", where_clause);

        let mut query_builder = sqlx::query_as::<_, Grade>(&query_str);
        let mut count_builder = sqlx::query_scalar::<_, i64>(&count_query_str);

        if let Some(campus_id) = query.campus_id {
            query_builder = query_builder.bind(campus_id);
            count_builder = count_builder.bind(campus_id);
        }
        if let Some(is_active) = query.is_active {
            query_builder = query_builder.bind(is_active);
            count_builder = count_builder.bind(is_active);
        }
        if let Some(ref academic_year) = query.academic_year {
            query_builder = query_builder.bind(academic_year);
            count_builder = count_builder.bind(academic_year);
        }

        let grades = query_builder.fetch_all(&self.pool).await?;
        let total = count_builder.fetch_one(&self.pool).await?;

        Ok(GradesListResponse { grades, total })
    }

    /// Update grade
    pub async fn update_grade(&self, grade_id: i64, request: &UpdateGradeRequest) -> Result<Grade> {
        let grade = sqlx::query_as::<_, Grade>(
            r#"
            UPDATE grades
            SET name = COALESCE($1, name),
                year_level = COALESCE($2, year_level),
                academic_year = COALESCE($3, academic_year),
                is_active = COALESCE($4, is_active),
                updated_at = NOW()
            WHERE id = $5
            RETURNING id, campus_id, name, year_level, academic_year, is_active, created_at, updated_at
            "#,
        )
        .bind(&request.name)
        .bind(request.year_level)
        .bind(&request.academic_year)
        .bind(request.is_active)
        .bind(grade_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(grade)
    }

    /// Deactivate a grade (graduate). Sets is_active = false and optionally suspends students.
    /// All operations run in a single transaction to prevent partial-commit data inconsistency.
    /// Returns the count of affected users.
    pub async fn deactivate_grade(
        &self,
        grade_id: i64,
        suspend_students: bool,
    ) -> Result<(Grade, i64)> {
        let grade = self.get_grade(grade_id).await?;

        if !grade.is_active {
            return Err(anyhow::anyhow!("Grade is already inactive"));
        }

        // Everything in one transaction: grade deactivation, optional student suspension,
        // user grade_id clear, class grade_id clear. Order matters — suspend must happen
        // BEFORE grade_id is cleared so the WHERE grade_id = $1 filter still matches.
        let mut tx = self.pool.begin().await?;

        // Step 1: Deactivate the grade
        let grade = sqlx::query_as::<_, Grade>(
            r#"
            UPDATE grades SET is_active = false, updated_at = NOW()
            WHERE id = $1
            RETURNING id, campus_id, name, year_level, academic_year, is_active, created_at, updated_at
            "#,
        )
        .bind(grade_id)
        .fetch_one(&mut *tx)
        .await?;

        // Step 2: Count users in this grade (before clearing grade_id)
        let affected: i64 =
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE grade_id = $1")
                .bind(grade_id)
                .fetch_one(&mut *tx)
                .await?;

        // Step 3: Optionally suspend student accounts BEFORE clearing grade_id.
        // users table uses `status` column (TEXT: active/inactive/banned), not `is_active`.
        // SECURITY: Only suspend pure-student accounts — users who hold ONLY the 'student'
        // role and no higher role (teacher, admin, etc.). This prevents accidentally
        // suspending admin/teacher accounts that happen to have grade_id set.
        if suspend_students && affected > 0 {
            sqlx::query(
                r#"
                UPDATE users SET status = 'inactive'
                WHERE grade_id = $1
                  AND id IN (
                    SELECT ur.user_id FROM user_roles ur
                    WHERE ur.role = 'student'
                  )
                  AND id NOT IN (
                    SELECT DISTINCT user_id FROM user_roles
                    WHERE role != 'student'
                  )
                "#,
            )
            .bind(grade_id)
            .execute(&mut *tx)
            .await?;
        }

        // Step 4: Clear grade_id for users in this grade
        sqlx::query("UPDATE users SET grade_id = NULL WHERE grade_id = $1")
            .bind(grade_id)
            .execute(&mut *tx)
            .await?;

        // Step 5: Clear grade_id for classes in this grade
        // NOTE: classes table has no is_active column; we clear grade_id instead.
        sqlx::query(
            r#"
            UPDATE classes SET grade_id = NULL, updated_at = NOW()
            WHERE grade_id = $1
            "#,
        )
        .bind(grade_id)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok((grade, affected))
    }

    /// Promote students: move all students in active grades to the next year_level
    /// by creating new grade rows with incremented year_level and new academic year.
    /// Returns count of new grades created.
    pub async fn promote_grades(
        &self,
        campus_id: i64,
        old_academic_year: &str,
        new_academic_year: &str,
    ) -> Result<Vec<Grade>> {
        // SECURITY (H-07): Wrap entire promotion in transaction for atomicity
        let mut tx = self.pool.begin().await?;

        // Get current active grades for this campus
        let current_grades = sqlx::query_as::<_, Grade>(
            r#"
            SELECT id, campus_id, name, year_level, academic_year, is_active, created_at, updated_at
            FROM grades
            WHERE campus_id = $1 AND academic_year = $2 AND is_active = true
            ORDER BY year_level ASC
            "#,
        )
        .bind(campus_id)
        .bind(old_academic_year)
        .fetch_all(&mut *tx)
        .await?;

        let mut new_grades = Vec::new();
        for old_grade in &current_grades {
            // Determine new name and year_level
            let new_year_level = old_grade.year_level + 1;
            let new_name = Self::promote_grade_name(&old_grade.name, new_year_level);

            let new_grade = sqlx::query_as::<_, Grade>(
                r#"
                INSERT INTO grades (campus_id, name, year_level, academic_year)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (campus_id, name, academic_year) DO NOTHING
                RETURNING id, campus_id, name, year_level, academic_year, is_active, created_at, updated_at
                "#,
            )
            .bind(campus_id)
            .bind(&new_name)
            .bind(new_year_level)
            .bind(new_academic_year)
            .fetch_optional(&mut *tx)
            .await?;

            if let Some(g) = new_grade {
                // Move students from old grade to new grade
                sqlx::query(
                    r#"
                    UPDATE users SET grade_id = $1
                    WHERE grade_id = $2
                    "#,
                )
                .bind(g.id)
                .bind(old_grade.id)
                .execute(&mut *tx)
                .await?;

                // Deactivate old grade
                sqlx::query(
                    r#"
                    UPDATE grades SET is_active = false, updated_at = NOW()
                    WHERE id = $1
                    "#,
                )
                .bind(old_grade.id)
                .execute(&mut *tx)
                .await?;

                new_grades.push(g);
            }
        }

        tx.commit().await?;
        Ok(new_grades)
    }

    /// Create new grades for an incoming academic year at a campus
    pub async fn create_academic_year_grades(
        &self,
        campus_id: i64,
        academic_year: &str,
        year_levels: &[i32],
        name_templates: &[String],
    ) -> Result<Vec<Grade>> {
        // Default to Chinese high school patterns if no templates provided
        let defaults = vec!["高一".to_string(), "高二".to_string(), "高三".to_string()];
        let templates = if name_templates.is_empty() {
            &defaults
        } else {
            name_templates
        };

        let mut grades = Vec::new();
        for (i, &year_level) in year_levels.iter().enumerate() {
            let name = templates
                .get(i)
                .cloned()
                .unwrap_or_else(|| format!("Grade {}", year_level));

            let grade = sqlx::query_as::<_, Grade>(
                r#"
                INSERT INTO grades (campus_id, name, year_level, academic_year)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (campus_id, name, academic_year) DO NOTHING
                RETURNING id, campus_id, name, year_level, academic_year, is_active, created_at, updated_at
                "#,
            )
            .bind(campus_id)
            .bind(&name)
            .bind(year_level)
            .bind(academic_year)
            .fetch_optional(&self.pool)
            .await?;

            if let Some(g) = grade {
                grades.push(g);
            }
        }

        Ok(grades)
    }

    /// Infer promoted grade name from current name
    fn promote_grade_name(current_name: &str, new_year_level: i32) -> String {
        match current_name {
            "高一" => "高二".to_string(),
            "高二" => "高三".to_string(),
            _ => {
                // For "Grade N" or "grade N" patterns, replace the trailing number
                let lower = current_name.to_lowercase();
                if lower.starts_with("grade ") {
                    format!("Grade {}", new_year_level)
                } else if lower.starts_with("year ") {
                    format!("Year {}", new_year_level)
                } else {
                    // Fallback: keep the name as-is (admin can update)
                    current_name.to_string()
                }
            }
        }
    }

    // ========== Class Management ==========

    /// Create a new class
    pub async fn create_class(
        &self,
        request: &CreateClassRequest,
        teacher_id: Uuid,
    ) -> Result<Class> {
        let now = Utc::now();
        let code = format!(
            "CLS{}",
            &Uuid::new_v4().simple().to_string()[..6].to_uppercase()
        );

        let class = sqlx::query_as::<_, Class>(
            r#"
            INSERT INTO classes (organization_id, campus_id, grade_id, name, teacher_id, semester, code, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
            RETURNING
                id,
                organization_id,
                campus_id,
                grade_id,
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
        .bind(request.grade_id)
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
                grade_id,
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
            "#,
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
                grade_id,
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
            "#,
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
            // No is_active column; SELECT hardcodes TRUE. Filter is boolean parameter:
            // true → TRUE (show all), false → FALSE (show none)
            conditions.push(format!("${}::BOOLEAN", param_count));
        }
        if query.grade_id.is_some() {
            param_count += 1;
            conditions.push(format!("grade_id = ${}", param_count));
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
                grade_id,
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

        let count_query_str = format!("SELECT COUNT(*) as count FROM classes {}", where_clause);

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
        if let Some(grade_id) = query.grade_id {
            query_builder = query_builder.bind(grade_id);
            count_builder = count_builder.bind(grade_id);
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
                grade_id = COALESCE($4, grade_id),
                updated_at = $5
            WHERE id = $6
            RETURNING
                id,
                organization_id,
                campus_id,
                grade_id,
                name,
                NULL::TEXT AS description,
                teacher_id,
                code,
                TRUE AS is_active,
                NULL::INTEGER AS max_students,
                semester,
                created_at,
                updated_at
            "#,
        )
        .bind(&request.name)
        .bind(request.campus_id)
        .bind(&request.semester)
        .bind(request.grade_id)
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
            "#,
        )
        .bind(class_id)
        .fetch_one(&self.pool)
        .await?;

        let total_assignments: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM assignments WHERE class_id = $1")
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
            "#,
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
    pub async fn add_student(&self, class_id: i64, username: &str) -> Result<ClassEnrollment> {
        // Get class
        let class = self.get_class(class_id).await?;

        // Find student by username within the same organization (SEC-03 tenant check)
        let student: (Uuid,) =
            sqlx::query_as("SELECT id FROM users WHERE username = $1 AND organization_id = $2")
                .bind(username)
                .bind(class.organization_id)
                .fetch_optional(&self.pool)
                .await?
                .ok_or_else(|| anyhow::anyhow!("Student not found in this organization"))?;

        // Check if already enrolled
        let existing =
            sqlx::query("SELECT id FROM class_enrollments WHERE class_id = $1 AND student_id = $2")
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
            "#,
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
        let existing =
            sqlx::query("SELECT id FROM class_enrollments WHERE class_id = $1 AND student_id = $2")
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
            "#,
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
        sqlx::query("DELETE FROM class_enrollments WHERE class_id = $1 AND student_id = $2")
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
                COALESCE(u.email, '') AS email,
                0 AS total_assignments,
                0 AS completed_assignments,
                0.0::DOUBLE PRECISION AS average_score,
                NULL::TIMESTAMPTZ AS last_submission
            FROM class_enrollments ce
            JOIN users u ON u.id = ce.student_id
            WHERE ce.class_id = $1
            ORDER BY ce.enrolled_at DESC
            "#,
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
        usernames: Vec<String>,
    ) -> Result<Vec<ClassEnrollment>> {
        let mut enrollments = Vec::new();

        for username in usernames {
            match self.add_student(class_id, &username).await {
                Ok(enrollment) => enrollments.push(enrollment),
                Err(e) => {
                    tracing::warn!("Failed to enroll student {}: {}", username, e);
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

    /// Get submissions for assignment
    pub async fn get_assignment_submissions(
        &self,
        assignment_id: i64,
    ) -> Result<Vec<AssignmentSubmission>> {
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

#[async_trait]
impl ClassMembershipChecker for ClassService {
    async fn get_class_student_ids(&self, class_id: i64) -> Result<Vec<Uuid>, AppError> {
        let students = self
            .get_class_students(class_id)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(students.iter().map(|s| s.student_id).collect())
    }
}
