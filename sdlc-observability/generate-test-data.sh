#!/bin/bash

# Generate test data for SDLC dashboards
# Usage: ./generate-test-data.sh

ES_URL="${ELASTICSEARCH_URL:-http://localhost:9200}"
INDEX_NAME="sdlc-logs-$(date +%Y.%m.%d)"

echo "Generating comprehensive test data for index: $INDEX_NAME"

# Helper function to send log
send_log() {
  curl -s -X POST "$ES_URL/$INDEX_NAME/_doc" -H 'Content-Type: application/json' -d "$1" > /dev/null
}

PROJECT_ID="405f7a5b-3ac3-4af0-a6d9-bb829dd68247"
PROJECT_NAME="Todo List API"

echo "📦 Creating project..."

# Project created
send_log '{
  "@timestamp": "'$(date -u -v-7d +%Y-%m-%dT%H:%M:%S)'Z",
  "level": "info",
  "event_type": "project_created",
  "service": "project-state",
  "project_id": "'$PROJECT_ID'",
  "project_name": "'$PROJECT_NAME'",
  "tech_stack": ["dotnet", "postgresql", "docker"],
  "message": "Project created"
}'

echo "📋 Generating phase events..."

# Phase progress for all phases
PHASES=("REQUIREMENTS" "ARCHITECTURE" "PLANNING" "DEVELOPMENT" "TESTING" "DEPLOYMENT")
PHASE_PROGRESS=(100 100 100 65 0 0)

for i in "${!PHASES[@]}"; do
  phase="${PHASES[$i]}"
  progress="${PHASE_PROGRESS[$i]}"
  
  # Phase started
  send_log '{
    "@timestamp": "'$(date -u -v-$((7-i))d +%Y-%m-%dT%H:%M:%S)'Z",
    "level": "info",
    "event_type": "phase_started",
    "service": "project-state",
    "project_id": "'$PROJECT_ID'",
    "project_name": "'$PROJECT_NAME'",
    "phase": "'$phase'",
    "current_phase": "'$phase'",
    "max_iterations": 5,
    "message": "Phase started: '$phase'"
  }'
  
  # Phase progress
  send_log '{
    "@timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S)'Z",
    "level": "info",
    "event_type": "phase_progress",
    "service": "project-state",
    "project_id": "'$PROJECT_ID'",
    "project_name": "'$PROJECT_NAME'",
    "phase": "'$phase'",
    "progress_percent": '$progress',
    "tasks_completed": '$((progress / 10))',
    "tasks_total": 10,
    "message": "'$phase': '$progress'% complete"
  }'
  
  # Phase status
  send_log '{
    "@timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S)'Z",
    "level": "info",
    "event_type": "phase_status",
    "service": "project-state",
    "project_id": "'$PROJECT_ID'",
    "project_name": "'$PROJECT_NAME'",
    "current_phase": "'$phase'",
    "phase": "'$phase'",
    "iteration": 3,
    "max_iterations": 5,
    "consensus_status": "APPROVED",
    "message": "Phase status update"
  }'
  sleep 0.05
done

# Phase transitions
for phase in "REQUIREMENTS" "ARCHITECTURE" "PLANNING" "DEVELOPMENT"; do
  send_log '{
    "@timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S)'Z",
    "level": "info",
    "event_type": "phase_transition",
    "service": "project-state",
    "project_id": "'$PROJECT_ID'",
    "project_name": "'$PROJECT_NAME'",
    "phase_to": "'$phase'",
    "message": "Transitioned to '$phase'"
  }'
  sleep 0.1
done

# AI Reviews (multiple iterations)
for iteration in 1 2 3; do
  for ai in "claude" "chatgpt" "gemini"; do
    if [ $iteration -eq 3 ]; then
      approved="true"
      approved_pct=100
    else
      if [ "$ai" = "claude" ]; then
        approved="true"
        approved_pct=100
      else
        approved="false"
        approved_pct=0
      fi
    fi
    
    send_log '{
      "@timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S)'Z",
      "level": "info",
      "event_type": "ai_review",
      "service": "ai-gateway",
      "project_id": "'$PROJECT_ID'",
      "project_name": "'$PROJECT_NAME'",
      "phase": "REQUIREMENTS",
      "iteration": '$iteration',
      "ai_name": "'$ai'",
      "approved": '$approved',
      "approved_percent": '$approved_pct',
      "feedback_count": '$((RANDOM % 10 + 1))',
      "feedback_severity": "high",
      "message": "'$ai' review iteration '$iteration'"
    }'
    sleep 0.05
  done
done

# Consensus reached
send_log '{
  "@timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S)'Z",
  "level": "info",
  "event_type": "consensus_reached",
  "service": "project-state",
  "project_id": "'$PROJECT_ID'",
  "project_name": "'$PROJECT_NAME'",
  "phase": "REQUIREMENTS",
  "iteration": 3,
  "iterations_to_consensus": 3,
  "consensus_status": "APPROVED",
  "claude_approved": true,
  "chatgpt_approved": true,
  "gemini_approved": true,
  "message": "Consensus reached after 3 iterations"
}'

# Sprint 1 Tasks
TASKS=("Database schema" "User registration" "Login endpoint" "JWT refresh" "Logout endpoint" "Health checks" "Docker setup")
AGENTS=("DATABASE" "BACKEND_DOTNET" "BACKEND_DOTNET" "BACKEND_DOTNET" "BACKEND_DOTNET" "BACKEND_DOTNET" "DEVOPS")
EPICS=("Epic 0: Infrastructure" "Epic 1: Authentication" "Epic 1: Authentication" "Epic 1: Authentication" "Epic 1: Authentication" "Epic 0: Infrastructure" "Epic 0: Infrastructure")
ESTIMATED=(3 4 3 3 2 2 3)
ACTUAL=(2 2 1.5 1.5 1 0.5 1)

echo "📝 Creating tasks..."

# Sprint started
send_log '{
  "@timestamp": "'$(date -u -v-2d +%Y-%m-%dT%H:%M:%S)'Z",
  "level": "info",
  "event_type": "sprint_started",
  "service": "sdlc-orchestrator",
  "project_id": "'$PROJECT_ID'",
  "project_name": "'$PROJECT_NAME'",
  "sprint_number": 1,
  "tasks_planned": 7,
  "tasks_total": 7,
  "tasks_completed": 0,
  "estimated_hours": 20,
  "completion_percent": 0,
  "message": "Sprint 1 started"
}'

# Create all tasks first
for i in "${!TASKS[@]}"; do
  task="${TASKS[$i]}"
  agent="${AGENTS[$i]}"
  epic="${EPICS[$i]}"
  est="${ESTIMATED[$i]}"
  
  send_log '{
    "@timestamp": "'$(date -u -v-2d +%Y-%m-%dT%H:%M:%S)'Z",
    "level": "info",
    "event_type": "task_created",
    "service": "project-state",
    "project_id": "'$PROJECT_ID'",
    "project_name": "'$PROJECT_NAME'",
    "task_id": "task-'$i'",
    "task_title": "'$task'",
    "agent_type": "'$agent'",
    "epic": "'$epic'",
    "estimated_hours": '$est',
    "status": "PENDING",
    "message": "Task created: '$task'"
  }'
  sleep 0.02
done

echo "🚀 Processing task lifecycle..."

# Task lifecycle: started -> completed
for i in "${!TASKS[@]}"; do
  task="${TASKS[$i]}"
  agent="${AGENTS[$i]}"
  epic="${EPICS[$i]}"
  est="${ESTIMATED[$i]}"
  act="${ACTUAL[$i]}"
  velocity=$(echo "scale=2; $est / $act" | bc)
  
  # Task started
  send_log '{
    "@timestamp": "'$(date -u -v-1d -v+'$i'H +%Y-%m-%dT%H:%M:%S)'Z",
    "level": "info",
    "event_type": "task_started",
    "service": "dev-tools",
    "project_id": "'$PROJECT_ID'",
    "project_name": "'$PROJECT_NAME'",
    "task_id": "task-'$i'",
    "task_title": "'$task'",
    "agent_type": "'$agent'",
    "epic": "'$epic'",
    "sprint_number": 1,
    "status": "IN_PROGRESS",
    "message": "Task started: '$task'"
  }'
  
  # Task status change
  send_log '{
    "@timestamp": "'$(date -u -v-1d -v+'$i'H +%Y-%m-%dT%H:%M:%S)'Z",
    "level": "info",
    "event_type": "task_status_change",
    "service": "project-state",
    "project_id": "'$PROJECT_ID'",
    "project_name": "'$PROJECT_NAME'",
    "task_id": "task-'$i'",
    "task_title": "'$task'",
    "from_status": "PENDING",
    "status": "IN_PROGRESS",
    "agent_type": "'$agent'",
    "epic": "'$epic'",
    "message": "Task status: PENDING -> IN_PROGRESS"
  }'
  
  # Task completed
  send_log '{
    "@timestamp": "'$(date -u -v+'$i'H +%Y-%m-%dT%H:%M:%S)'Z",
    "level": "info",
    "event_type": "task_completed",
    "service": "dev-tools",
    "project_id": "'$PROJECT_ID'",
    "project_name": "'$PROJECT_NAME'",
    "task_id": "task-'$i'",
    "task_title": "'$task'",
    "agent_type": "'$agent'",
    "epic": "'$epic'",
    "sprint_number": 1,
    "estimated_hours": '$est',
    "actual_hours": '$act',
    "velocity": '$velocity',
    "status": "COMPLETED",
    "message": "Task completed: '$task'"
  }'
  
  # Task status change to completed
  send_log '{
    "@timestamp": "'$(date -u -v+'$i'H +%Y-%m-%dT%H:%M:%S)'Z",
    "level": "info",
    "event_type": "task_status_change",
    "service": "project-state",
    "project_id": "'$PROJECT_ID'",
    "project_name": "'$PROJECT_NAME'",
    "task_id": "task-'$i'",
    "task_title": "'$task'",
    "from_status": "IN_PROGRESS",
    "status": "COMPLETED",
    "agent_type": "'$agent'",
    "epic": "'$epic'",
    "message": "Task status: IN_PROGRESS -> COMPLETED"
  }'
  
  # Sprint progress update
  completed=$((i + 1))
  pct=$((completed * 100 / 7))
  send_log '{
    "@timestamp": "'$(date -u -v+'$i'H +%Y-%m-%dT%H:%M:%S)'Z",
    "level": "info",
    "event_type": "sprint_progress",
    "service": "sdlc-orchestrator",
    "project_id": "'$PROJECT_ID'",
    "project_name": "'$PROJECT_NAME'",
    "sprint_number": 1,
    "tasks_completed": '$completed',
    "tasks_total": 7,
    "hours_spent": '$act',
    "hours_estimated": 20,
    "completion_percent": '$pct',
    "message": "Sprint 1: '$completed'/7 tasks"
  }'
  
  sleep 0.03
done

echo "🔄 Generating iteration events..."

# Quality gates
for task_num in 0 1 2 3 4 5 6; do
  for gate in "L1_TASK_COMPLETION" "L2_UNIT_TESTING"; do
    passed=$((RANDOM % 10 > 1)) # 90% pass rate
    pass_rate=$((RANDOM % 20 + 80))
    
    send_log '{
      "@timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S)'Z",
      "level": "info",
      "event_type": "quality_gate",
      "service": "project-state",
      "project_id": "'$PROJECT_ID'",
      "project_name": "'$PROJECT_NAME'",
      "task_id": "task-'$task_num'",
      "gate_level": "'$gate'",
      "passed": '$( [ $passed -eq 1 ] && echo "true" || echo "false" )',
      "pass_rate": '$pass_rate',
      "message": "Quality gate '$gate'"
    }'
    sleep 0.02
  done
done

# Sprint completed
send_log '{
  "@timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S)'Z",
  "level": "info",
  "event_type": "sprint_completed",
  "service": "sdlc-orchestrator",
  "project_id": "'$PROJECT_ID'",
  "project_name": "'$PROJECT_NAME'",
  "sprint_number": 1,
  "tasks_completed": 7,
  "estimated_hours": 20,
  "actual_hours": 9.5,
  "velocity": 2.1,
  "message": "Sprint 1 completed"
}'

# Git commits
COMMITS=("feat: Initialize project" "feat: Add user model" "feat: Implement auth" "test: Add auth tests" "docs: Update README")
for commit in "${COMMITS[@]}"; do
  hash=$(openssl rand -hex 3)
  send_log '{
    "@timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S)'Z",
    "level": "info",
    "event_type": "git_commit",
    "service": "dev-tools",
    "project_id": "'$PROJECT_ID'",
    "project_name": "'$PROJECT_NAME'",
    "commit_hash": "'$hash'",
    "commit_message": "'$commit'",
    "message": "Git commit: '$commit'"
  }'
  sleep 0.05
done

echo ""
echo "✅ Test data generated!"
echo ""
echo "View dashboards at:"
echo "  - Grafana: http://localhost:3000"
echo "  - Kibana: http://localhost:5601"
