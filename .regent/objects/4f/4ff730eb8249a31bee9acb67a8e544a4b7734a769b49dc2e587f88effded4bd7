use anyhow::Result;
use judge_worker::queue::{
    consumer::{acknowledge_submission, consume_submission, ensure_consumer_group},
    producer::send_judge_result,
    SubmissionMessage,
};
use redis::Client;
use std::time::Duration;
use tokio::time::sleep;

fn create_test_submission(submission_id: i64, problem_id: i64) -> SubmissionMessage {
    SubmissionMessage {
        submission_id,
        problem_id,
        user_id: uuid::Uuid::new_v4(),
        language: "python3".to_string(),
        source_code: "print('Hello, World!')".to_string(),
        time_limit_ms: 1000,
        memory_limit_mb: 256,
        contest_id: None,
    }
}

async fn add_test_message(
    client: &Client,
    stream_name: &str,
    submission: &SubmissionMessage,
) -> Result<String> {
    use redis::AsyncCommands;
    let mut conn = client.get_async_connection().await?;
    let data_json = serde_json::to_string(submission)?;
    
    let message_id: String = redis::cmd("XADD")
        .arg(stream_name)
        .arg("*")
        .arg("submission_id")
        .arg(submission.submission_id.to_string())
        .arg("data")
        .arg(data_json)
        .query_async(&mut conn)
        .await?;
    
    Ok(message_id)
}

#[tokio::test]
#[ignore = "requires Redis"]
async fn test_ensure_consumer_group() {
    let client = Client::open("redis://127.0.0.1/").unwrap();
    let stream_name = "test_stream_group";
    let group_name = "test_workers_group";
    
    {
        let mut conn = client.get_async_connection().await.unwrap();
        let _: () = redis::cmd("DEL").arg(stream_name).query_async(&mut conn).await.unwrap();
    }
    
    ensure_consumer_group(&client, stream_name, group_name)
        .await
        .expect("Failed to create consumer group");
    
    ensure_consumer_group(&client, stream_name, group_name)
        .await
        .expect("Failed to ensure consumer group exists");
    
    {
        let mut conn = client.get_async_connection().await.unwrap();
        let _: () = redis::cmd("DEL").arg(stream_name).query_async(&mut conn).await.unwrap();
    }
}

#[tokio::test]
#[ignore = "requires Redis"]
async fn test_consume_and_acknowledge() {
    let client = Client::open("redis://127.0.0.1/").unwrap();
    let stream_name = "test_consume_stream";
    let group_name = "test_consume_group";
    let consumer_name = "test_consume_consumer";
    
    {
        let mut conn = client.get_async_connection().await.unwrap();
        let _: () = redis::cmd("DEL").arg(stream_name).query_async(&mut conn).await.unwrap();
    }
    
    ensure_consumer_group(&client, stream_name, group_name)
        .await
        .expect("Failed to create consumer group");
    
    let test_submission = create_test_submission(123, 456);
    let message_id = add_test_message(&client, stream_name, &test_submission)
        .await
        .expect("Failed to add test message");
    
    sleep(Duration::from_millis(100)).await;
    
    let messages = consume_submission(&client, stream_name, group_name, consumer_name, Some(2000))
        .await
        .expect("Failed to consume message");
    
    assert_eq!(messages.len(), 1, "Should receive exactly one message");
    
    let (received_id, received_submission) = &messages[0];
    assert_eq!(received_submission.submission_id, 123);
    assert_eq!(received_submission.problem_id, 456);
    assert_eq!(received_submission.language, "python3");
    assert_eq!(received_submission.source_code, "print('Hello, World!')");
    
    assert!(!received_id.is_empty(), "Message ID should not be empty");
    
    let ack_result = acknowledge_submission(&client, stream_name, group_name, received_id)
        .await
        .expect("Failed to acknowledge message");
    
    assert_eq!(ack_result, 1, "Should acknowledge exactly one message");
    
    let messages2 = consume_submission(&client, stream_name, group_name, consumer_name, Some(1000))
        .await
        .expect("Failed to consume message second time");
    
    assert_eq!(messages2.len(), 0, "Should receive no messages after acknowledgment");
    
    {
        let mut conn = client.get_async_connection().await.unwrap();
        let _: () = redis::cmd("DEL").arg(stream_name).query_async(&mut conn).await.unwrap();
    }
}

#[tokio::test]
#[ignore = "requires Redis"]
async fn test_consume_non_blocking() {
    let client = Client::open("redis://127.0.0.1/").unwrap();
    let stream_name = "test_non_blocking_stream";
    let group_name = "test_non_blocking_group";
    let consumer_name = "test_non_blocking_consumer";
    
    {
        let mut conn = client.get_async_connection().await.unwrap();
        let _: () = redis::cmd("DEL").arg(stream_name).query_async(&mut conn).await.unwrap();
    }
    
    ensure_consumer_group(&client, stream_name, group_name)
        .await
        .expect("Failed to create consumer group");
    
    let messages = consume_submission(&client, stream_name, group_name, consumer_name, Some(0))
        .await
        .expect("Failed to consume message");
    
    assert_eq!(messages.len(), 0, "Should receive no messages in non-blocking mode");
    
    {
        let mut conn = client.get_async_connection().await.unwrap();
        let _: () = redis::cmd("DEL").arg(stream_name).query_async(&mut conn).await.unwrap();
    }
}

#[tokio::test]
#[ignore = "requires Redis"]
async fn test_consume_multiple_messages() {
    let client = Client::open("redis://127.0.0.1/").unwrap();
    let stream_name = "test_multiple_stream";
    let group_name = "test_multiple_group";
    let consumer_name = "test_multiple_consumer";
    
    {
        let mut conn = client.get_async_connection().await.unwrap();
        let _: () = redis::cmd("DEL").arg(stream_name).query_async(&mut conn).await.unwrap();
    }
    
    ensure_consumer_group(&client, stream_name, group_name)
        .await
        .expect("Failed to create consumer group");
    
    let submission1 = create_test_submission(1001, 201);
    let submission2 = create_test_submission(1002, 202);
    let submission3 = create_test_submission(1003, 203);
    
    add_test_message(&client, stream_name, &submission1)
        .await
        .expect("Failed to add first message");
    
    add_test_message(&client, stream_name, &submission2)
        .await
        .expect("Failed to add second message");
    
    add_test_message(&client, stream_name, &submission3)
        .await
        .expect("Failed to add third message");
    
    sleep(Duration::from_millis(100)).await;
    
    let mut received_submissions = Vec::new();
    
    for _ in 0..3 {
        let messages = consume_submission(&client, stream_name, group_name, consumer_name, Some(1000))
            .await
            .expect("Failed to consume message");
        
        if !messages.is_empty() {
            let (message_id, submission) = messages[0].clone();
            received_submissions.push(submission.submission_id);
            
            acknowledge_submission(&client, stream_name, group_name, &message_id)
                .await
                .expect("Failed to acknowledge message");
        }
    }
    
    assert_eq!(received_submissions.len(), 3, "Should receive exactly three messages");
    assert!(received_submissions.contains(&1001), "Should receive submission 1001");
    assert!(received_submissions.contains(&1002), "Should receive submission 1002");
    assert!(received_submissions.contains(&1003), "Should receive submission 1003");
    
    let messages = consume_submission(&client, stream_name, group_name, consumer_name, Some(1000))
        .await
        .expect("Failed to consume message");
    
    assert_eq!(messages.len(), 0, "Should receive no messages after consuming all");
    
    {
        let mut conn = client.get_async_connection().await.unwrap();
        let _: () = redis::cmd("DEL").arg(stream_name).query_async(&mut conn).await.unwrap();
    }
}

#[tokio::test]
#[ignore = "requires Redis"]
async fn test_acknowledge_nonexistent_message() {
    let client = Client::open("redis://127.0.0.1/").unwrap();
    let stream_name = "test_ack_stream";
    let group_name = "test_ack_group";
    
    {
        let mut conn = client.get_async_connection().await.unwrap();
        let _: () = redis::cmd("DEL").arg(stream_name).query_async(&mut conn).await.unwrap();
    }
    
    ensure_consumer_group(&client, stream_name, group_name)
        .await
        .expect("Failed to create consumer group");
    
    let ack_result = acknowledge_submission(&client, stream_name, group_name, "123456789-0")
        .await
        .expect("Failed to acknowledge non-existent message");
    
    assert_eq!(ack_result, 0, "Should acknowledge 0 messages for non-existent message");
    
    {
        let mut conn = client.get_async_connection().await.unwrap();
        let _: () = redis::cmd("DEL").arg(stream_name).query_async(&mut conn).await.unwrap();
    }
}