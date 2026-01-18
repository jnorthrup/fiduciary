# GCP Console Session Interface Design

## Overview
This document defines the **GCP Console Session Interface**, a standardized programmatic interface designed for Claude Code agents to interact with the Google Cloud Platform (GCP) securely and efficiently. It acts as a wrapper around the `gcloud` CLI and Google Cloud Client Libraries, providing a stable "session" abstraction similar to an interactive console experience.

## Authentication Patterns
Based on industry best practices for automation, this interface supports three authentication strategies:

1.  **Service Account Key (Standard Automation)**
    *   **Method**: `gcloud auth activate-service-account --key-file=KEY_FILE`
    *   **Use Case**: Unattended agents, CI/CD pipelines, autonomous tasks.
    *   **Security**: Requires secure storage of the JSON key file.

2.  **Workload Identity Federation (Enterprise)**
    *   **Method**: Impersonation via external identity providers (e.g., GitHub Actions, AWS).
    *   **Use Case**: Federated environments where keys are avoided.

3.  **Application Default Credentials (ADC)**
    *   **Method**: `gcloud auth application-default login` (or inherited from environment).
    *   **Use Case**: Local development or when the agent shares the host's identity.

## Interface Definition (TypeScript)

The following TypeScript interface defines the contract for the GCP Console Session.

```typescript
/**
 * Represents the configuration for a GCP Session.
 */
export interface GCPSessionConfig {
  projectId?: string;
  region?: string;
  serviceAccountKeyPath?: string;
  impersonateServiceAccount?: string;
}

/**
 * Result of a GCP command execution.
 */
export interface CommandResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  rawOutput: string;
}

/**
 * The Core Console Session Interface.
 */
export interface IGCPConsoleSession {
  /**
   * Initializes the session, handling authentication and configuration.
   * Throws an error if authentication fails.
   */
  connect(config: GCPSessionConfig): Promise<boolean>;

  /**
   * Switches the active project context for the current session.
   */
  setProject(projectId: string): Promise<void>;

  /**
   * checks if the session is currently authenticated and valid.
   */
  isAuthenticated(): Promise<boolean>;

  /**
   * Executes a raw gcloud command.
   * @param command The gcloud command arguments (e.g., "compute instances list")
   * @param format The desired output format (default: 'json')
   */
  execute(command: string, format?: 'json' | 'text' | 'yaml'): Promise<CommandResult>;

  /**
   * Ends the session and cleans up temporary credentials if necessary.
   */
  disconnect(): Promise<void>;
}
```

## Implementation Strategy

### 1. The `GCloudWrapper`
A concrete implementation of `IGCPConsoleSession` that spawns `gcloud` subprocesses.

*   **JSON Parsing**: Automatically appends `--format=json` to commands and parses the stdout.
*   **Error Handling**: Catches stderr and exit codes, wrapping them in `CommandResult`.
*   **State Management**: Maintains internal state for `projectId` to ensure consistency across commands.

### 2. Usage Example (Agent Workflow)

```typescript
const session = new GCPConsoleSession();

// 1. Login
await session.connect({
  serviceAccountKeyPath: '/secrets/gcp-sa-key.json',
  projectId: 'trust-ledger-demo'
});

// 2. Perform Action (e.g., Verify GKE Cluster)
const clusters = await session.execute('container clusters list --region us-central1');

if (clusters.success) {
  const targetCluster = clusters.data.find(c => c.name === 'trust-ledger-demo');
  if (targetCluster.status === 'RUNNING') {
    console.log('Cluster is healthy.');
  }
}
```

## Security Considerations
*   **Credential Isolation**: The interface should support using temporary credential files that are securely deleted on `disconnect()`.
*   **Least Privilege**: The Service Account used by the agent should only have permissions required for the specific task (e.g., `roles/container.developer` for GKE work), not `Owner`.
*   **Audit Logging**: The wrapper should optionally log all executed commands (masking secrets) to an audit trail.
