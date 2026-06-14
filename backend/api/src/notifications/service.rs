use super::models::*;
use anyhow::Result;
use sqlx::PgPool;
use sqlx::Row;
use uuid::Uuid;

pub struct NotificationService {
    db: PgPool,
}

impl NotificationService {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    /// List notifications for a user
    pub async fn list_notifications(
        &self,
        user_id: Uuid,
        query: ListNotificationsQuery,
    ) -> Result<NotificationsListResponse> {
        // Clamp limit/offset to prevent negative values (which would cause
        // SQL errors) and unbounded result sets.
        let limit = query.limit.unwrap_or(20).clamp(1, 100);
        let offset = query.offset.unwrap_or(0).max(0);

        // Build dynamic query
        let mut base_query = "SELECT * FROM notifications WHERE user_id = $1".to_string();
        let mut count_query = "SELECT COUNT(*) FROM notifications WHERE user_id = $1".to_string();
        let mut conditions = vec![];
        let mut param_count = 1;

        // Unread filter
        if query.unread_only.unwrap_or(false) {
            param_count += 1;
            conditions.push(format!(" AND is_read = ${}", param_count));
        }

        // Type filter
        if let Some(_notif_type) = &query.notification_type {
            param_count += 1;
            conditions.push(format!(" AND type = ${}", param_count));
        }

        let conditions_str = conditions.join("");
        base_query.push_str(&conditions_str);
        count_query.push_str(&conditions_str);

        base_query.push_str(&format!(
            " ORDER BY created_at DESC LIMIT ${} OFFSET ${}",
            param_count + 1,
            param_count + 2
        ));

        // Execute count query
        let mut count_builder = sqlx::query_scalar::<_, i64>(&count_query);
        count_builder = count_builder.bind(user_id);

        if query.unread_only.unwrap_or(false) {
            count_builder = count_builder.bind(true);
        }

        if let Some(notif_type) = &query.notification_type {
            count_builder = count_builder.bind(notif_type);
        }

        let total = count_builder.fetch_one(&self.db).await?;

        // Get unread count
        let unread_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE",
        )
        .bind(user_id)
        .fetch_one(&self.db)
        .await?;

        // Execute main query
        let mut query_builder = sqlx::query_as::<_, Notification>(&base_query);
        query_builder = query_builder.bind(user_id);

        if query.unread_only.unwrap_or(false) {
            query_builder = query_builder.bind(true);
        }

        if let Some(notif_type) = &query.notification_type {
            query_builder = query_builder.bind(notif_type);
        }

        // Bind LIMIT and OFFSET as parameters (not string-interpolated).
        query_builder = query_builder.bind(limit).bind(offset);

        let notifications = query_builder.fetch_all(&self.db).await?;

        Ok(NotificationsListResponse {
            notifications,
            total,
            unread_count,
            limit,
            offset,
        })
    }

    /// Mark notifications as read
    pub async fn mark_as_read(&self, user_id: Uuid, notification_ids: Vec<Uuid>) -> Result<i64> {
        let result = sqlx::query(
            "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND id = ANY($2)",
        )
        .bind(user_id)
        .bind(&notification_ids)
        .execute(&self.db)
        .await?;

        Ok(result.rows_affected() as i64)
    }

    /// Mark all notifications as read for a user
    pub async fn mark_all_as_read(&self, user_id: Uuid) -> Result<i64> {
        let result = sqlx::query(
            "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
        )
        .bind(user_id)
        .execute(&self.db)
        .await?;

        Ok(result.rows_affected() as i64)
    }

    /// Get notification statistics
    pub async fn get_stats(&self, user_id: Uuid) -> Result<NotificationStatsResponse> {
        let total_count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM notifications WHERE user_id = $1")
                .bind(user_id)
                .fetch_one(&self.db)
                .await?;

        let unread_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE",
        )
        .bind(user_id)
        .fetch_one(&self.db)
        .await?;

        // Get count by type
        let by_type_rows = sqlx::query(
            "SELECT type, COUNT(*) as count FROM notifications WHERE user_id = $1 GROUP BY type",
        )
        .bind(user_id)
        .fetch_all(&self.db)
        .await?;

        let mut by_type = serde_json::Map::new();
        for row in by_type_rows {
            let notif_type: String = row.try_get("type")?;
            let count: i64 = row.try_get("count")?;
            by_type.insert(notif_type, serde_json::json!(count));
        }

        Ok(NotificationStatsResponse {
            total_count,
            unread_count,
            by_type: serde_json::Value::Object(by_type),
        })
    }

    /// Delete a notification
    pub async fn delete_notification(&self, user_id: Uuid, notification_id: Uuid) -> Result<bool> {
        let result = sqlx::query("DELETE FROM notifications WHERE user_id = $1 AND id = $2")
            .bind(user_id)
            .bind(notification_id)
            .execute(&self.db)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Get user notification settings
    pub async fn get_settings(&self, user_id: Uuid) -> Result<Option<NotificationSettings>> {
        let settings = sqlx::query_as::<_, NotificationSettings>(
            "SELECT * FROM notification_settings WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_optional(&self.db)
        .await?;

        Ok(settings)
    }

    /// Update user notification settings
    pub async fn update_settings(
        &self,
        user_id: Uuid,
        settings: NotificationSettings,
    ) -> Result<NotificationSettings> {
        let result = sqlx::query_as::<_, NotificationSettings>(
            r#"
            INSERT INTO notification_settings (
                user_id, email_notifications, reply_notifications,
                comment_notifications, like_notifications,
                mention_notifications, system_notifications, digest_mode
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (user_id) DO UPDATE SET
                email_notifications = EXCLUDED.email_notifications,
                reply_notifications = EXCLUDED.reply_notifications,
                comment_notifications = EXCLUDED.comment_notifications,
                like_notifications = EXCLUDED.like_notifications,
                mention_notifications = EXCLUDED.mention_notifications,
                system_notifications = EXCLUDED.system_notifications,
                digest_mode = EXCLUDED.digest_mode
            RETURNING *
            "#,
        )
        .bind(user_id)
        .bind(settings.email_notifications)
        .bind(settings.reply_notifications)
        .bind(settings.comment_notifications)
        .bind(settings.like_notifications)
        .bind(settings.mention_notifications)
        .bind(settings.system_notifications)
        .bind(&settings.digest_mode)
        .fetch_one(&self.db)
        .await?;

        Ok(result)
    }
}
