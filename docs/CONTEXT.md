# WorkspaceNow

A self-hosted, entity-driven platform on which one organization builds, connects and operates its own business applications, APIs, agents and workflows.

## Installation and organization

**Installation**:
One deployed copy of WorkspaceNow, run on the customer's own infrastructure, serving exactly one Organization.
_Avoid_: Tenant, instance, workspace

**Organization**:
The single top-level administrative boundary of an Installation; it owns every resource.
_Avoid_: Tenant, customer, account

**Department** / **Team**:
Internal boundaries of the Organization used for ownership and authorization. They are not tenants.
_Avoid_: Business unit (as a separate concept), sub-tenant

**Workspace**:
One of exactly six fixed areas of the product — Studio, Connect, Data, AI, Flow, Control. Users cannot create Workspaces.
_Avoid_: Using "workspace" for the whole product or for an Installation

**Shell**:
The console frame that hosts the six Workspaces: global navigation, the signed-in user and the Workspace switcher.
_Avoid_: WorkspaceNow Workspace, portal

## Identity and authorization

**Identity Provider**:
The customer's OIDC provider; it establishes who a user is and asserts their group claims.
_Avoid_: WorkspaceNow login, user store

**Role**:
A named set of Permissions defined in WorkspaceNow.

**Group Mapping**:
The rule that grants a Role to every user carrying a given identity-provider group claim.
_Avoid_: Role assignment (for users directly)

**Permission**:
The right to perform one kind of Business Operation or administrative action, e.g. approving purchase requests.

**Service Identity**:
The identity, with its own Permissions, under which an Agent or a Workflow acts. It never inherits the caller's Permissions.
_Avoid_: System user, admin token

**Actor**:
Whoever performed an action: a user, an Agent, a Workflow or the system.

## Applications

**Application**:
A business application built in Studio, owned by a Department, e.g. Inventory Management.
_Avoid_: App (in written docs), project

**Application Blueprint**:
The versioned, declarative definition of an Application — its Entities, pages, operations, workflows and permissions — and its source of truth.
_Avoid_: Config, manifest

**Release**:
An immutable, numbered version of an Application Blueprint.

**Environment**:
A deployment stage — Development, Staging or Production — with its own configuration and policies. Not a tenant.

**Deployment**:
A Release running in an Environment. Promotion follows Development → Staging → Production.

## Data

**Entity**:
A business-level contract for a concept such as Product or PurchaseRequest: fields, relationships, rules, ownership and events. It is not a database table.
_Avoid_: Table, model, schema (for the business concept)

**Entity Scope**:
Who owns an Entity's authoritative writes: one Application (application-scoped), the Organization (shared), or an external system (read-only in WorkspaceNow).

**Record**:
One instance of an Entity.
_Avoid_: Row, document

**Entity Runtime**:
The shared platform component that validates, persists, authorizes and publishes events for Records.

## Execution

**Business Operation**:
One governed unit of business logic, such as "create purchase request". Every Entry Point invokes the same Business Operation, so authorization and validation never diverge.
_Avoid_: Endpoint, handler, action (for the logic itself)

**Entry Point**:
The interface through which a Business Operation was invoked: a Studio application, an API, an MCP tool, an Agent or a Workflow.

**API Operation**:
An HTTP method and path in Connect that invokes one Business Operation.
_Avoid_: Route

**MCP Tool**:
An API Operation exposed to MCP clients, or a tool discovered on a registered external MCP server.

**Agent**:
An AI worker with instructions, a model, assigned MCP Tools and a Service Identity. It proposes actions; the platform decides whether they are permitted.
_Avoid_: Bot, assistant (as a type)

**Platform Agent**:
A built-in Agent that helps build WorkspaceNow resources, such as the Application Architect.

**Business Agent**:
An Agent an organization builds to work on its business, such as the Procurement Assistant.

**Agent Run**:
One invocation of an Agent, with its reasoning steps and tool calls.

**Workflow**:
A durable, deterministic process started by a trigger (an Event, a schedule or a person) and made of steps.
_Avoid_: Automation, flow (for a single process)

**Execution**:
One run of a Workflow; it survives restarts and can wait on people.
_Avoid_: Instance, job

**Approval**:
A Workflow step waiting for a person holding a specific Permission to approve or reject.

**Event**:
A fact published after a Business Operation commits, such as Stock.LowStockReached.

**Audit Record**:
The record of one attempted action: Actor, Entry Point, action, resource and whether it was allowed, denied or failed.
_Avoid_: Log line

**Trace**:
All Audit Records and Events that share one origin, e.g. a sale through to the purchase order it caused.
