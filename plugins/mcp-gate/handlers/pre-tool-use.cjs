'use strict';

/**
 * @param {{ tool_name: string }} payload
 * @param {{ allowedMcpServers?: string[] }} config
 */
module.exports = async function preToolUse(payload, config) {
  const toolName = payload?.tool_name;

  if (!toolName || !toolName.startsWith('mcp__')) {
    return undefined;
  }

  const serverName = toolName.split('__')[1];
  if (!serverName) return undefined;

  const allowed = config?.allowedMcpServers;
  if (!allowed || allowed.length === 0) return undefined;

  if (!allowed.includes(serverName)) {
    return {
      decision: 'block',
      reason:
        `MCP server "${serverName}" is not allowed in this project.\n` +
        `Allowed servers: ${allowed.join(', ')}\n` +
        `Run "cpm mcp-gate" to update the allowlist.`,
    };
  }

  return undefined;
};
