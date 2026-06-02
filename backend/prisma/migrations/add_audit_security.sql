-- Add Audit Log Table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "userId" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "action" VARCHAR(255) NOT NULL,
  "table_name" VARCHAR(100),
  "record_id" UUID,
  "before_data" JSONB,
  "after_data" JSONB,
  "ip_address" VARCHAR(45),
  "user_agent" TEXT,
  "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB
);

-- Add Security Log Table
CREATE TABLE IF NOT EXISTS "security_logs" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "type" VARCHAR(100) NOT NULL,
  "severity" VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  "userId" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "ip_address" VARCHAR(45),
  "details" JSONB,
  "resolved" BOOLEAN DEFAULT FALSE,
  "resolved_at" TIMESTAMP WITH TIME ZONE,
  "resolved_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add Rate Limit Table
CREATE TABLE IF NOT EXISTS "rate_limits" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "identifier" VARCHAR(255) NOT NULL, -- IP or userId
  "endpoint" VARCHAR(255) NOT NULL,
  "attempts" INTEGER DEFAULT 1,
  "blocked_until" TIMESTAMP WITH TIME ZONE,
  "first_attempt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "last_attempt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("identifier", "endpoint")
);

-- Add Session Management Table
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" VARCHAR(512) UNIQUE NOT NULL,
  "refresh_token" VARCHAR(512) UNIQUE,
  "ip_address" VARCHAR(45),
  "user_agent" TEXT,
  "is_active" BOOLEAN DEFAULT TRUE,
  "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
  "refresh_expires_at" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add Permissions Table
CREATE TABLE IF NOT EXISTS "permissions" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "resource" VARCHAR(100) NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "description" TEXT,
  UNIQUE("resource", "action")
);

-- Add Role Permissions Junction Table
CREATE TABLE IF NOT EXISTS "role_permissions" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "role" VARCHAR(50) NOT NULL,
  "permissionId" UUID NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
  UNIQUE("role", "permissionId")
);

-- Add User Permissions Override Table
CREATE TABLE IF NOT EXISTS "user_permissions" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "permissionId" UUID NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
  "granted" BOOLEAN DEFAULT TRUE,
  "expires_at" TIMESTAMP WITH TIME ZONE,
  UNIQUE("userId", "permissionId")
);

-- Create indexes for performance
CREATE INDEX idx_audit_logs_userId ON audit_logs(userId);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);

CREATE INDEX idx_security_logs_type ON security_logs(type);
CREATE INDEX idx_security_logs_severity ON security_logs(severity);
CREATE INDEX idx_security_logs_timestamp ON security_logs(timestamp DESC);
CREATE INDEX idx_security_logs_resolved ON security_logs(resolved);

CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX idx_rate_limits_blocked ON rate_limits(blocked_until);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_userId ON sessions(userId);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Insert default permissions
INSERT INTO permissions (resource, action, description) VALUES
  ('students', 'create', 'Create new students'),
  ('students', 'read', 'View student information'),
  ('students', 'update', 'Update student information'),
  ('students', 'delete', 'Delete students'),
  ('payments', 'create', 'Create new payments'),
  ('payments', 'read', 'View payment information'),
  ('payments', 'update', 'Update payment information'),
  ('payments', 'delete', 'Delete payments'),
  ('users', 'create', 'Create new users'),
  ('users', 'read', 'View user information'),
  ('users', 'update', 'Update user information'),
  ('users', 'delete', 'Delete users'),
  ('reports', 'generate', 'Generate reports'),
  ('reports', 'export', 'Export reports'),
  ('settings', 'read', 'View system settings'),
  ('settings', 'update', 'Update system settings'),
  ('audit', 'read', 'View audit logs'),
  ('security', 'manage', 'Manage security settings')
ON CONFLICT (resource, action) DO NOTHING;

-- Assign permissions to roles
-- Admin gets everything
INSERT INTO role_permissions (role, permissionId)
SELECT 'ADMIN', id FROM permissions
ON CONFLICT (role, permissionId) DO NOTHING;

-- Teacher gets limited permissions
INSERT INTO role_permissions (role, permissionId)
SELECT 'TEACHER', id FROM permissions
WHERE (resource = 'students' AND action IN ('create', 'read', 'update'))
   OR (resource = 'payments' AND action IN ('create', 'read'))
   OR (resource = 'reports' AND action IN ('generate', 'export'))
ON CONFLICT (role, permissionId) DO NOTHING;

-- Student gets minimal permissions
INSERT INTO role_permissions (role, permissionId)
SELECT 'STUDENT', id FROM permissions
WHERE (resource = 'students' AND action = 'read')
   OR (resource = 'payments' AND action = 'read')
ON CONFLICT (role, permissionId) DO NOTHING;