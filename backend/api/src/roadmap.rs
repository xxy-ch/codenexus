use crate::AppState;
use api_infra::error::AppError;
use axum::{
    extract::State,
    routing::get,
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use shared::models::{Claims, Role};
use std::str::FromStr;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RoadmapNode {
    pub id: String,
    pub title: String,
    pub description: String,
    pub topics: Vec<String>,
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Serialize)]
pub struct RoadmapResponse {
    pub nodes: Vec<RoadmapNode>,
    pub editable: bool,
}

#[derive(Debug, Deserialize)]
pub struct SaveRoadmapRequest {
    pub nodes: Vec<RoadmapNode>,
}

fn default_nodes() -> Vec<RoadmapNode> {
    vec![
        RoadmapNode {
            id: "basic".into(),
            title: "基础语法与算法".into(),
            description: "掌握编程竞赛入门必备的数据结构基础".into(),
            topics: vec!["数组与矩阵".into(), "字符串处理".into(), "哈希表".into()],
            x: 50.0,
            y: 18.0,
        },
        RoadmapNode {
            id: "medium-ds".into(),
            title: "中级数据结构".into(),
            description: "学习常用的数据存储与区间查询方法".into(),
            topics: vec!["栈与队列".into(), "链表高级操作".into(), "并查集基础".into()],
            x: 28.0,
            y: 50.0,
        },
        RoadmapNode {
            id: "medium-algo".into(),
            title: "核心算法技巧".into(),
            description: "掌握经典算法的优化与常见变种".into(),
            topics: vec!["二分与三分".into(), "滑动窗口".into(), "贪心与排序".into()],
            x: 72.0,
            y: 50.0,
        },
        RoadmapNode {
            id: "advanced".into(),
            title: "高级动态规划与图论".into(),
            description: "挑战高难度综合性算法竞赛题目".into(),
            topics: vec!["状态压缩DP".into(), "最短路算法".into(), "网络流计算".into()],
            x: 50.0,
            y: 82.0,
        },
    ]
}

fn can_edit(role: Role) -> bool {
    role.is_higher_or_equal(Role::GradeAdmin)
}

fn parse_role(claims: &Claims) -> Result<Role, AppError> {
    Role::from_str(&claims.role).map_err(|_| AppError::Forbidden("Invalid role".into()))
}

fn validate_nodes(nodes: &[RoadmapNode]) -> Result<(), AppError> {
    if nodes.is_empty() || nodes.len() > 12 {
        return Err(AppError::Validation("路线图节点数量必须为 1-12 个".into()));
    }

    for node in nodes {
        if node.id.trim().is_empty()
            || node.title.trim().is_empty()
            || node.description.trim().is_empty()
            || node.topics.is_empty()
            || node.topics.len() > 8
            || !(0.0..=100.0).contains(&node.x)
            || !(0.0..=100.0).contains(&node.y)
        {
            return Err(AppError::Validation("路线图节点格式错误".into()));
        }
    }

    Ok(())
}

async fn get_roadmap(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
) -> Result<Json<RoadmapResponse>, AppError> {
    let role = parse_role(&claims)?;
    let nodes_value = sqlx::query_scalar::<_, serde_json::Value>(
        "SELECT nodes FROM learning_roadmaps WHERE organization_id = $1",
    )
    .bind(claims.school_id)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|err| AppError::database(err.to_string()))?;

    let nodes = match nodes_value {
        Some(value) => serde_json::from_value(value)
            .map_err(|err| AppError::Internal(format!("Invalid roadmap JSON: {}", err)))?,
        None => default_nodes(),
    };

    Ok(Json(RoadmapResponse {
        nodes,
        editable: can_edit(role),
    }))
}

async fn save_roadmap(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
    Json(req): Json<SaveRoadmapRequest>,
) -> Result<Json<RoadmapResponse>, AppError> {
    let role = parse_role(&claims)?;
    if !can_edit(role) {
        return Err(AppError::Forbidden("Only admins can edit learning roadmap".into()));
    }
    validate_nodes(&req.nodes)?;

    let nodes_value = serde_json::to_value(&req.nodes)
        .map_err(|err| AppError::Internal(format!("Failed to encode roadmap: {}", err)))?;

    sqlx::query(
        r#"
        INSERT INTO learning_roadmaps (organization_id, nodes, updated_by, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (organization_id)
        DO UPDATE SET
            nodes = EXCLUDED.nodes,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
        "#,
    )
    .bind(claims.school_id)
    .bind(nodes_value)
    .bind(claims.sub)
    .execute(&state.db_pool)
    .await
    .map_err(|err| AppError::database(err.to_string()))?;

    Ok(Json(RoadmapResponse {
        nodes: req.nodes,
        editable: true,
    }))
}

pub fn roadmap_router() -> Router<AppState> {
    Router::new().route("/", get(get_roadmap).put(save_roadmap))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn admins_can_edit_roadmap() {
        assert!(can_edit(Role::Root));
        assert!(can_edit(Role::CampusAdmin));
        assert!(can_edit(Role::GradeAdmin));
        assert!(!can_edit(Role::Teacher));
        assert!(!can_edit(Role::Student));
    }

    #[test]
    fn validates_node_bounds() {
        let mut nodes = default_nodes();
        assert!(validate_nodes(&nodes).is_ok());

        nodes[0].x = 101.0;
        assert!(validate_nodes(&nodes).is_err());
    }
}
