/**
 * Project-Specific Agent Loader
 *
 * Reads agent definitions from project's docs/agents/*.md files
 * and merges them with the default AGENT_REGISTRY.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ProjectAgent {
  id: string;
  type: string;
  name: string;
  techStack: string[];
  responsibilities: string[];
  qualityGates: string[];
  systemPrompt: string;
  collaborators: string[];
  filePath: string;
}

/**
 * Parse a markdown agent definition file
 */
function parseAgentMarkdown(content: string, filePath: string): ProjectAgent | null {
  try {
    // Extract metadata table
    const metadataMatch = content.match(/## Metadata[\s\S]*?\|[\s\S]*?\|[\s\S]*?\|([\s\S]*?)(?=##|$)/);
    const metadata: Record<string, string> = {};

    if (metadataMatch) {
      const rows = metadataMatch[1].split('\n').filter(line => line.includes('|'));
      for (const row of rows) {
        const cells = row.split('|').map(c => c.trim()).filter(c => c);
        if (cells.length >= 2) {
          const key = cells[0].replace(/\*\*/g, '').toLowerCase();
          const value = cells[1].replace(/`/g, '');
          metadata[key] = value;
        }
      }
    }

    // Extract tech stack
    const techStackMatch = content.match(/## Tech Stack\s*\n([\s\S]*?)(?=##|$)/);
    const techStack: string[] = [];
    if (techStackMatch) {
      const lines = techStackMatch[1].split('\n');
      for (const line of lines) {
        const match = line.match(/^-\s+(.+)$/);
        if (match) {
          techStack.push(match[1].trim());
        }
      }
    }

    // Extract responsibilities
    const respMatch = content.match(/## (?:Sorumluluklar|Responsibilities)\s*\n([\s\S]*?)(?=##|$)/);
    const responsibilities: string[] = [];
    if (respMatch) {
      const lines = respMatch[1].split('\n');
      for (const line of lines) {
        const match = line.match(/^\d+\.\s+(.+)$/);
        if (match) {
          responsibilities.push(match[1].trim());
        }
      }
    }

    // Extract quality gates
    const qgMatch = content.match(/## Quality Gates\s*\n([\s\S]*?)(?=##|$)/);
    const qualityGates: string[] = [];
    if (qgMatch) {
      const lines = qgMatch[1].split('\n');
      for (const line of lines) {
        const match = line.match(/^-\s+\[.\]\s+(.+)$/);
        if (match) {
          qualityGates.push(match[1].trim());
        }
      }
    }

    // Extract system prompt
    const promptMatch = content.match(/## System Prompt\s*\n```[\s\S]*?\n([\s\S]*?)```/);
    const systemPrompt = promptMatch ? promptMatch[1].trim() : '';

    // Extract collaborators
    const collabMatch = content.match(/## Collaborators\s*\n([\s\S]*?)(?=##|---|$)/);
    const collaborators: string[] = [];
    if (collabMatch) {
      const lines = collabMatch[1].split('\n');
      for (const line of lines) {
        const match = line.match(/^-\s+(.+?)(?:\s+\(|$)/);
        if (match) {
          collaborators.push(match[1].trim());
        }
      }
    }

    return {
      id: metadata['id'] || '',
      type: metadata['tip'] || metadata['type'] || '',
      name: metadata['isim'] || metadata['name'] || path.basename(filePath, '.md'),
      techStack,
      responsibilities,
      qualityGates,
      systemPrompt,
      collaborators,
      filePath
    };
  } catch (error) {
    console.error(`Failed to parse agent file ${filePath}:`, error);
    return null;
  }
}

/**
 * Load all agent definitions from a project's docs/agents directory
 */
export function loadProjectAgents(workspacePath: string): ProjectAgent[] {
  const agents: ProjectAgent[] = [];
  const agentsDir = path.join(workspacePath, 'docs', 'agents');

  if (!fs.existsSync(agentsDir)) {
    return agents;
  }

  const files = fs.readdirSync(agentsDir);

  for (const file of files) {
    if (file.endsWith('.md') && file !== 'README.md') {
      const filePath = path.join(agentsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const agent = parseAgentMarkdown(content, filePath);

      if (agent && agent.systemPrompt) {
        agents.push(agent);
      }
    }
  }

  return agents;
}

/**
 * Get agent by type from project agents
 */
export function getProjectAgentByType(
  workspacePath: string,
  agentType: string
): ProjectAgent | null {
  const agents = loadProjectAgents(workspacePath);
  return agents.find(a => a.type.toUpperCase() === agentType.toUpperCase()) || null;
}

/**
 * Get agent system prompt for task execution
 * Returns project-specific prompt if available, otherwise returns default prompt
 */
export function getAgentSystemPrompt(
  workspacePath: string,
  agentType: string,
  fallbackPrompt?: string
): string {
  const projectAgent = getProjectAgentByType(workspacePath, agentType);

  if (projectAgent && projectAgent.systemPrompt) {
    return projectAgent.systemPrompt;
  }

  return fallbackPrompt || `You are a ${agentType} agent. Complete the assigned task following best practices.`;
}

/**
 * Generate agent context for task execution
 * Includes system prompt, tech stack, and responsibilities
 */
export function generateAgentContext(
  workspacePath: string,
  agentType: string
): string {
  const agent = getProjectAgentByType(workspacePath, agentType);

  if (!agent) {
    return '';
  }

  let context = `# Agent: ${agent.name}\n\n`;

  if (agent.techStack.length > 0) {
    context += `## Tech Stack\n${agent.techStack.map(t => `- ${t}`).join('\n')}\n\n`;
  }

  if (agent.responsibilities.length > 0) {
    context += `## Responsibilities\n${agent.responsibilities.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\n`;
  }

  if (agent.systemPrompt) {
    context += `## Instructions\n${agent.systemPrompt}\n`;
  }

  return context;
}
