package identity

import (
	"context"
	"errors"
	"regexp"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/oapi"
)

var hexColorRe = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

const themeSettingsKey = "theme"

// OrganizationTheme returns the installation's white-label theme (empty when unset).
func (s *service) OrganizationTheme(ctx context.Context) (*oapi.Theme, error) {
	t := &oapi.Theme{}
	doc, err := s.settings.Get(ctx, themeSettingsKey)
	if errors.Is(err, docstore.ErrNotFound) {
		return t, nil
	}
	if err != nil {
		return nil, err
	}
	if c, ok := (*doc)["primaryColor"].(string); ok {
		t.PrimaryColor = &c
	}
	if l, ok := (*doc)["logoUrl"].(string); ok {
		t.LogoUrl = &l
	}
	return t, nil
}

// UpdateOrganizationTheme sets the installation's white-label theme. Requires control.manage.
func (s *service) UpdateOrganizationTheme(ctx context.Context, ec kernel.ExecutionContext, t oapi.Theme) (*oapi.Theme, error) {
	color := ""
	if t.PrimaryColor != nil {
		color = *t.PrimaryColor
	}
	if color != "" && !hexColorRe.MatchString(color) {
		return nil, kernel.Invalid("primaryColor must be a hex color like #6d28d9")
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "control.manage", "organization.theme", "organization/theme"); err != nil {
		return nil, err
	}
	logo := ""
	if t.LogoUrl != nil {
		logo = *t.LogoUrl
	}
	doc := map[string]any{"primaryColor": color, "logoUrl": logo}
	if err := s.settings.Put(ctx, &doc); err != nil {
		return nil, err
	}
	if err := s.auditor.Record(ctx, ec, "organization.theme", "organization/theme", kernel.OutcomeAllowed, color); err != nil {
		return nil, err
	}
	return &t, nil
}
