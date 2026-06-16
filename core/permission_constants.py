"""
Granular permission keys for the UEW CerTiFyHub access provisioning system.

Every permission defaults to OFF. The Super Admin must explicitly enable
each permission at account provisioning time, justified by the approved
system access request letter.
"""

# ── Grantable permissions (Super Admin toggles these per-account) ────────

GRANTABLE_PERMISSIONS = {
    # Category 1 — Certificate Management
    "certificates.issue": "Issue certificates",
    "certificates.revoke": "Revoke certificates",
    "certificates.edit_drafts": "Edit certificate drafts",
    "certificates.view_all": "View all certificates",
    "certificates.download": "Download certificates",

    # Category 2 — Student Registry (batches + records)
    "registry.sessions.create": "Create issuance batches",
    "registry.records.upload": "Upload student records",
    "registry.records.manage": "Manage student records (edit/delete in Draft)",
    "registry.sessions.publish": "Publish batches and dispatch confirmation emails",
    "registry.confirmation.view": "View confirmation status",
    "registry.disputes.resolve": "Resolve student disputes",
    "registry.issuance.initiate": "Initiate certificate issuance",
    "registry.export": "Export batch data",

    # Category 3 — Verification
    "verification.verify": "Verify certificates",
    "verification.view_logs": "View verification logs",

    # Category 4 — Reporting and Audit
    "reports.view": "View reports",
    "reports.export": "Export reports",

    # Category 5 — System Configuration (limited grantable)
    "templates.manage": "Manage templates",
}

# ── Super-Admin-only permissions (never grantable via letter) ────────────

SUPER_ADMIN_ONLY_PERMISSIONS = {
    "registry.sessions.archive": "Archive issuance batches",
    "registry.faculties.manage": "Manage faculties and departments",
    "accounts.view_list": "View account list",
    "accounts.deactivate": "Deactivate accounts",
    "accounts.modify_permissions": "Modify account permissions",
    "audit.view": "View audit log",
    "system.manage_settings": "Manage institution settings",
    "system.manage_integrations": "Manage integrations",
}

# ── All permission keys (for validation) ─────────────────────────────────

ALL_GRANTABLE_KEYS = set(GRANTABLE_PERMISSIONS.keys())
ALL_SUPER_ADMIN_ONLY_KEYS = set(SUPER_ADMIN_ONLY_PERMISSIONS.keys())
ALL_PERMISSION_KEYS = ALL_GRANTABLE_KEYS | ALL_SUPER_ADMIN_ONLY_KEYS

# ── Permission categories for UI grouping ────────────────────────────────

PERMISSION_CATEGORIES = [
    {
        "id": "certificate_management",
        "label": "Certificate Management",
        "permissions": [
            "certificates.issue",
            "certificates.revoke",
            "certificates.edit_drafts",
            "certificates.view_all",
            "certificates.download",
        ],
    },
    {
        "id": "student_registry",
        "label": "Student Registry",
        "permissions": [
            "registry.sessions.create",
            "registry.records.upload",
            "registry.records.manage",
            "registry.sessions.publish",
            "registry.confirmation.view",
            "registry.disputes.resolve",
            "registry.issuance.initiate",
            "registry.export",
        ],
    },
    {
        "id": "verification",
        "label": "Verification",
        "permissions": [
            "verification.verify",
            "verification.view_logs",
        ],
    },
    {
        "id": "user_account_management",
        "label": "User and Account Management",
        "description": "Super Admin only — not grantable via standard letter.",
        "permissions": [],
    },
    {
        "id": "reporting_audit",
        "label": "Reporting and Audit",
        "permissions": [
            "reports.view",
            "reports.export",
        ],
    },
    {
        "id": "system_configuration",
        "label": "System Configuration",
        "permissions": [
            "templates.manage",
        ],
    },
]


def build_default_permissions():
    """Return a dict with every grantable permission set to False."""
    return {key: False for key in GRANTABLE_PERMISSIONS}
