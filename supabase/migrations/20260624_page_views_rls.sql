-- Drop the overly-broad SELECT policy that let any authenticated user read all page views.
-- Reads are now restricted to service_role (admin/analytics queries only).

DROP POLICY IF EXISTS "page_views_auth_select" ON page_views;

CREATE POLICY "page_views_service_select" ON page_views
  FOR SELECT TO service_role USING (true);
