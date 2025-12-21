#!/bin/bash

# Wait for Elasticsearch to be ready
echo "Waiting for Elasticsearch..."
until curl -s http://localhost:9200/_cluster/health | grep -q '"status":"green"\|"status":"yellow"'; do
  sleep 2
done
echo "Elasticsearch is ready!"

# Create index template for SDLC logs
curl -X PUT "http://localhost:9200/_index_template/sdlc-logs-template" -H 'Content-Type: application/json' -d'
{
  "index_patterns": ["sdlc-logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0,
      "index.lifecycle.name": "sdlc-logs-policy"
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "level": { "type": "keyword" },
        "event_type": { "type": "keyword" },
        "service": { "type": "keyword" },
        "project_id": { "type": "keyword" },
        "project_name": { "type": "keyword" },
        "phase": { "type": "keyword" },
        "phase_from": { "type": "keyword" },
        "phase_to": { "type": "keyword" },
        "iteration": { "type": "integer" },
        "iterations_to_consensus": { "type": "integer" },
        "ai_name": { "type": "keyword" },
        "approved": { "type": "boolean" },
        "approved_percent": { "type": "float" },
        "consensus_status": { "type": "keyword" },
        "claude_approved": { "type": "boolean" },
        "chatgpt_approved": { "type": "boolean" },
        "gemini_approved": { "type": "boolean" },
        "feedback_count": { "type": "integer" },
        "feedback_severity": { "type": "keyword" },
        "task_id": { "type": "keyword" },
        "task_title": { "type": "text" },
        "agent_type": { "type": "keyword" },
        "epic": { "type": "keyword" },
        "sprint_number": { "type": "integer" },
        "estimated_hours": { "type": "float" },
        "actual_hours": { "type": "float" },
        "velocity": { "type": "float" },
        "gate_level": { "type": "keyword" },
        "passed": { "type": "boolean" },
        "pass_rate": { "type": "float" },
        "commit_hash": { "type": "keyword" },
        "commit_message": { "type": "text" },
        "tech_stack": { "type": "keyword" },
        "message": { "type": "text" }
      }
    }
  }
}
'

# Create ILM policy to manage log retention
curl -X PUT "http://localhost:9200/_ilm/policy/sdlc-logs-policy" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_age": "7d",
            "max_size": "1gb"
          }
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
'

echo ""
echo "✅ Elasticsearch index template and ILM policy created!"
echo ""
echo "Index pattern: sdlc-logs-*"
echo "Retention: 30 days"
