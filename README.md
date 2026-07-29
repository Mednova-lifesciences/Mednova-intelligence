# MedNova Compass

# Legacy MedNova Platform — Rebuild Specification




## 1. Purpose of the Legacy Platform




The legacy MedNova platform is a regulatory-intelligence and commercial-operations workstation for MedNova Lifesciences. Its purpose is to track pharmaceutical and healthcare products registered in Nigeria, monitor their regulatory lifecycle, identify commercial opportunities, and surface renewal and compliance signals that matter to the business.




The original product is not a general-purpose CRM. It is a hybrid operational desktop/web platform intended for:




- monitoring registered products and their lifecycle status

- understanding manufacturer, applicant, and product relationships

- identifying renewal and expiration risk

- surfacing commercial opportunities from the product portfolio

- feeding a later CRM layer with company and opportunity context




### 1.1 Problem it solves




The platform addresses a practical business problem: regulatory data is fragmented and changes over time. MedNova needs a reliable internal system to ingest, normalize, and review Green Book data so the business can understand:




- what products are registered

- who manufactures or applies for them

- which products are nearing expiry

- which products create commercial revenue opportunities

- which regulatory events require proactive action




### 1.2 Who uses it




The platform is designed for internal business users such as:




- operations leads

- commercial teams

- regulatory intelligence operators

- management users viewing dashboard KPIs

- administrators running sync workflows




### 1.3 What Green Book is




Green Book refers to the Nigerian regulatory product registry data source used by the platform. The platform treats it as the authoritative upstream source for products, applicants, manufacturers, categories, dosage forms, and routes of administration.




The sync engine periodically fetches Green Book records, normalizes them into the internal schema, and updates the local database. The legacy platform is therefore fundamentally a Green Book ingestion and intelligence layer.




### 1.4 What data it manages




The platform manages:




- product registrations

- applicant and manufacturer entities

- product categories, dosage forms, ingredients, and routes

- approval and expiry dates

- regulatory status

- renewal risk data

- revenue pipeline opportunities

- sync operations and change history

- optional CRM-adjacent tables that were added later




### 1.5 End-to-end user workflow




A typical user journey is:




1. Open the dashboard or legacy dashboard.

2. Review overall counts for manufacturers, products, opportunities, and expiring items.

3. Open the products page to search and filter the product inventory.

4. Open an individual product detail page to inspect its regulatory metadata.

5. Review renewal alerts for products nearing expiry.

6. Review revenue opportunities generated from the current product portfolio.

7. Trigger Green Book sync manually to refresh the database.

8. Review sync history and change activity.




## 2. Legacy Pages




The legacy platform is composed of a small set of server-rendered pages backed by Flask templates.




### 2.1 Dashboard / Legacy dashboard




Route:

- /

- /dashboard

- /legacy-dashboard




Purpose:

- Provide the primary management overview for the legacy platform.

- Show business KPIs and recent operational signals.




Navigation:

- Header navigation links to Dashboard, Products, Opportunities, Renewals, and CRM.




Buttons:

- A “Sync Green Book” button triggers the sync workflow.




Filters:

- None on the dashboard itself.




Search:

- None on the dashboard itself.




Tables:

- Top revenue opportunities table.

- Products by category table.

- Top renewal opportunities table.




Cards:

- Manufacturers card.

- Registered products card.

- Revenue opportunities card.

- Estimated pipeline card.

- Expiring in 12 months card.




Modals/dialogs:

- None directly, although the dashboard provides a sync status panel.




Empty states:

- If no sync history exists, the page states that no sync has yet run.




Loading states:

- The page does not implement a spinner; it is rendered once the server-side data is available.




Error states:

- The dashboard uses a defensive metric wrapper that falls back to placeholders when a metric fails to build.




Responsive behaviour:

- The page uses a simple one-column mobile stack and a multi-column card layout on larger screens.




### 2.2 Products page




Route:

- /products




Purpose:

- Search, filter, and browse the product inventory loaded from Green Book and normalized into the local database.




Navigation:

- Reachable from the header.




Buttons:

- Search button.

- Reset link in the query form.

- Pagination links for previous/next pages.




Filters:

- Search query field.

- Manufacturer filter.

- Applicant filter.

- Category filter.

- Status filter.

- Expiry filter with values for expiring in 12 months, expired, active, and any expiry.

- Sort selector with options for newest, oldest, product name, manufacturer, expiry date, and approval date.

- Page-size input.




Search:

- Search is applied across product name, registration number, generic name, and active ingredient.




Tables:

- Main product table with columns for product name, category, applicant, manufacturer, registration number, approval date, expiry date, and status.

- Each row links to the product detail page.




Cards:

- The page does not use separate cards beyond the summary banner.




Modals/dialogs:

- None.




Empty states:

- If no matching rows are found, the table will render empty and the page can show an error if the data layer fails.




Loading states:

- None.




Error states:

- The page can show an error banner if the products query fails.




Responsive behaviour:

- The table is horizontally scrollable because of its density.




### 2.3 Product detail page




Route:

- /products/<pid>




Purpose:

- Show all available regulatory metadata for one product.




Navigation:

- Reachable by clicking a product row on the products page.




Buttons:

- None.




Filters:

- None.




Search:

- None.




Tables:

- None.




Cards:

- A detail section with semantic fields rendered as label-value pairs.




Modals/dialogs:

- None.




Empty states:

- If the product does not exist, Flask aborts with 404.




Loading states:

- None.




Error states:

- 404 when the product ID is missing.




Responsive behaviour:

- The detail section stacks vertically by default.




### 2.4 Opportunities page




Route:

- /opportunities




Purpose:

- Review commercial opportunities derived from products and pipeline data.




Navigation:

- Reachable from the header.




Buttons:

- Apply filters.

- Reset filters.

- Previous/Next pagination.

- Inline “View” buttons for each row.

- Generate Report and Add Opportunity to CRM buttons in inline detail sections.




Filters:

- Search field.

- Category.

- Status.

- Priority.

- Probability.

- Estimated value range.

- Service type.

- Manufacturer.

- Sort order.




Search:

- Full-text search over company, manufacturer, product, category, service, status, and recommendation.




Tables:

- Main table of opportunities with columns for opportunity ID, company, manufacturer, product, category, service type, estimated value, probability, priority, expiry date, status, recommendation, and created at.

- Inline details row that expands below a selected row.




Cards:

- KPI cards for total opportunities, high priority, closing soon, total pipeline value, and average opportunity value.

- Commercial action cards inside the expandable detail row.




Modals/dialogs:

- A report drawer and CRM success toast are implemented in the template.




Empty states:

- The page can show an error message if the repository fails.




Loading states:

- The report drawer shows animated loading steps when a report is generated.




Error states:

- The page shows an error banner if loading the opportunity list fails.




Responsive behaviour:

- The main table is horizontally scrollable.




### 2.5 Renewals page




Route:

- /renewals




Purpose:

- Review products approaching expiry within a selected future window.




Navigation:

- Reachable from the header.




Buttons:

- Update button.




Filters:

- A months selector with 3, 6, 12, 18, 24, and 36 month options.




Search:

- None.




Tables:

- Renewal list table with product, NAFDAC number, category, applicant, expiry, and status columns.




Cards:

- None.




Modals/dialogs:

- None.




Empty states:

- Empty table if no products match the period.




Loading states:

- None.




Error states:

- Error banner if the renewal query fails.




Responsive behaviour:

- The table is scrollable.




### 2.6 Health and admin endpoints




Routes:

- /api/health

- /health

- /api/ready

- /ready

- /admin/sync

- /admin/sync/status

- /admin/cloud-sync

- /admin/cloud-sync/status

- /api/cron/greenbook-sync

- /api/cron/greenbook-sync/status




Purpose:

- Support operational checks and manual sync execution for the legacy workflow.




Navigation:

- Not user-facing pages; used by operators or automation.




Buttons/controls:

- None in UI templates; invoked by scripts or automation.




## 3. Dashboard Deep Dive




### 3.1 KPI cards




The dashboard renders five cards:




- Manufacturers: the count of distinct manufacturer names encountered in the product dataset.

- Registered products: the count of products in the database.

- Revenue opportunities: the number of rows in the revenue_pipeline table.

- Estimated pipeline: the sum of estimated_value from revenue_pipeline.

- Expiring in 12 months: the count of products with expiry_date in the next 365 days, excluding statuses such as expired, revoked, and withdrawn.




### 3.2 Top revenue opportunities




The dashboard shows the highest-value pipeline rows from revenue_pipeline. Each row displays:




- company

- category

- number of products

- estimated value

- recommended services

- status




### 3.3 Products by category




The dashboard aggregates products by category and shows a simple count table.




### 3.4 Top renewal opportunities




The dashboard shows a compact list of products with expiry dates in the next 12 months.




### 3.5 Green Book refresh status




The dashboard includes a section that allows the user to trigger Green Book sync manually. It displays:




- the last sync status

- the number of products added by the last sync

- the sync payload from sync_history if present




### 3.6 How values are calculated




- Manufacturers count is derived from distinct manufacturer identifiers or names across the product rows.

- Products count is from the products table.

- Revenue opportunities count is from the revenue_pipeline table.

- Estimated pipeline uses the estimated_value field from revenue_pipeline.

- Expiring count uses expiry_date and excludes products already expired or withdrawn.




## 4. Products Domain




### 4.1 Product record semantics




The core product record includes:




- product name

- generic name

- active ingredient

- strength

- dosage form

- route of administration

- category

- description

- pack size

- composition

- approval date

- expiry date

- status

- applicant

- manufacturer

- registration number

- source last updated

- sync timestamps




### 4.2 Product search behavior




The products page performs server-side filtering and pagination.




Search uses the repository layer to look up matching records by fields such as:




- product_name

- registration_number

- generic_name

- active_ingredient




### 4.3 Product relationships




Products are linked to:




- applicants through applicant_id

- manufacturers through manufacturer_id

- categories through category_id

- dosage forms through dosage_form_id

- routes through route_id




The repository normalizes these relationships into user-facing fields such as applicant_name, manufacturer_name, product_category, dosage_form, and route_of_administration.




### 4.4 Product detail presentation




The product detail page renders a compact semantic profile comprising:




- category

- NAFDAC number

- applicant

- manufacturer

- dosage form

- route

- strength

- approval date

- expiry date

- status

- pack size

- composition




## 5. Opportunities Domain




### 5.1 How opportunities are generated




The current platform derives opportunities from the Green Book sync workflow rather than from user-entered data. The sync engine builds a revenue_pipeline table aggregated from products.




Each pipeline row is derived from a group of products by company and category and includes:




- company name

- category

- number of products

- estimated value

- recommended services

- status

- expiry date




### 5.2 Opportunity scoring and priority




The PipelineRepository computes:




- priority based on estimated value and status

- probability based on estimated value and status




Rules are:




- status won, closed, or lost => low priority

- value above 5,000,000 or status urgent/high => high priority

- value above 1,000,000 or status active/pending => medium priority

- otherwise low priority




Probability rules:




- won => 100%

- closed/lost => 0%

- value over 5,000,000 => 80%

- value over 1,000,000 => 60%

- otherwise 40%




### 5.3 Opportunity list behavior




The opportunities page:




- loads from revenue_pipeline via PipelineRepository

- supports filtering and sorting

- calculates summary KPIs

- identifies closing-soon items by recency of update time




## 6. Renewals Domain




### 6.1 Renewal workflow




Renewal monitoring is based on products with expiry_date values. The renewal engine builds renewal_alerts rows by evaluating existing products and assigning an alert level.




### 6.2 Alert logic




Alert levels are:




- EXPIRED

- RED

- YELLOW

- GREEN




The logic is based on the remaining number of days to the expiry date. The current implementation uses a simple date window.




### 6.3 Renewal page calculations




The renewal page accepts a month window and returns products expiring in that range. It orders the list by expiry date ascending.




## 7. Green Book Sync and Import




### 7.1 What the sync engine does




The sync engine is the backbone of the legacy platform. It:




- connects to the Green Book data source

- fetches product records

- normalizes them into the internal schema

- upserts products into the products table

- ensures lookup tables such as manufacturers, applicants, categories, routes, and dosage forms exist

- builds renewal_alerts

- builds opportunities

- builds a revenue_pipeline table

- records sync history and product changes

- optionally syncs to Supabase if enabled




### 7.2 Source ingestion strategy




The GreenBookClient first attempts paginated JSON requests to the Green Book endpoint. If those requests fail or return something unusable, it falls back to HTML scraping with BeautifulSoup.




### 7.3 Normalization flow




The mapper converts raw Green Book field names into the internal schema fields used by the platform. The normalized record includes:




- source_product_id

- registration_number

- product_name

- generic_name

- active_ingredient

- strength

- dosage_form_name

- route_name

- category_name

- description

- pack_size

- composition

- approval_date

- expiry_date

- status

- manufacturer_name

- applicant_name

- source_last_updated




### 7.4 Product upsert and change tracking




The updater logic:




- uses registration_number as the identity key

- inserts new products when the registration number is not present

- updates existing products when fields change

- writes every changed field into product_changes

- marks products as removed from source if they are no longer present in the latest ingest




### 7.5 Renewal engine




The renewal engine deletes existing renewal_alerts rows and rebuilds them from products. It assigns alert levels based on how close the expiry date is.




### 7.6 Opportunity engine




The opportunity engine rebuilds opportunities from products and adds rows for:




- inactive registrations

- expiring registrations

- manufacturer renewal watch

- new approval opportunities




### 7.7 Sync history




The system records sync runs in sync_history and stores:




- start/end time

- status

- counts added/updated/removed

- duration

- error message




## 8. Database Specification (Legacy Only)




The legacy platform uses SQLite locally and can route through Supabase for some tables when available. The legacy tables relevant to the original platform are:




### 8.1 manufacturers




Columns:

- id

- nafdac_manufacturer_id

- manufacturer_name

- country

- address

- created_at

- updated_at




Purpose:

- Store normalized manufacturer entries.




### 8.2 applicants




Columns:

- id

- nafdac_applicant_id

- applicant_name

- address

- created_at

- updated_at




Purpose:

- Store normalized applicant entries.




### 8.3 ingredients




Columns:

- id

- ingredient_name

- synonym

- created_at

- updated_at




Purpose:

- Store canonical ingredient names.




### 8.4 categories




Columns:

- id

- nafdac_category_id

- category_name

- created_at

- updated_at




Purpose:

- Store product categories.




### 8.5 dosage_forms




Columns:

- id

- nafdac_form_id

- form_name

- created_at

- updated_at




Purpose:

- Store dosage form lookups.




### 8.6 routes




Columns:

- id

- nafdac_route_id

- route_name

- created_at

- updated_at




Purpose:

- Store administration routes.




### 8.7 products




Columns:

- id

- nafdac_product_id

- registration_number

- product_name

- generic_name

- active_ingredient

- strength

- dosage_form_id

- route_id

- category_id

- atc_code

- description

- pack_size

- composition

- approval_date

- expiry_date

- status

- applicant_id

- manufacturer_id

- source_last_updated

- synced_at

- created_at

- updated_at




Purpose:

- Core registry of product lifecycle information.




### 8.8 product_ingredients




Columns:

- product_id

- ingredient_id

- created_at




Purpose:

- Join table for many-to-many product-to-ingredient relationships.




### 8.9 sync_history




Columns:

- id

- started_at

- finished_at

- status

- products_added

- products_updated

- products_removed

- duration_seconds

- error_message




Purpose:

- Track each sync run.




### 8.10 product_changes




Columns:

- id

- product_id

- field_name

- old_value

- new_value

- changed_at




Purpose:

- Audit trail of product updates.




### 8.11 renewal_alerts




Columns:

- id

- product_id

- expiry_date

- days_remaining

- alert_level

- created_at

- updated_at




Purpose:

- Store computed renewal warning states for products.




### 8.12 watchlist




Columns:

- id

- product_id

- notes

- created_at




Purpose:

- Support a simple product watch list.




### 8.13 search_cache




Columns:

- id

- query_text

- result_count

- response_json

- created_at

- updated_at




Purpose:

- Cache search results for repeated queries.




### 8.14 opportunities




Columns:

- id

- product_id

- title

- description

- category

- created_at

- updated_at




Purpose:

- Store opportunity records derived from products.




### 8.15 revenue_pipeline




Columns:

- id

- company

- category

- products

- estimated_value

- recommended_services

- status

- expiry_date

- created_at

- updated_at




Purpose:

- Aggregate product portfolio data into a commercial opportunity view.




## 9. Legacy API Surface




The legacy platform exposes both HTML pages and operational API endpoints.




### 9.1 HTML routes




- GET /

- GET /dashboard

- GET /legacy-dashboard

- GET /products

- GET /products/<pid>

- GET /opportunities

- GET /renewals




### 9.2 Health and admin routes




- GET /api/health

- GET /health

- GET /api/ready

- GET /ready

- POST /admin/sync

- GET /admin/sync/status

- POST /admin/cloud-sync

- GET /admin/cloud-sync/status

- POST /api/cron/greenbook-sync

- GET /api/cron/greenbook-sync/status

- POST /api/dashboard/sync/greenbook




### 9.3 Endpoint behavior




- The admin sync routes invoke the sync engine and return a summary payload.

- The health routes return a basic JSON status response.

- The dashboard sync routes are thin wrappers over the sync engine.




## 10. Backend Services and Modules




### 10.1 Flask app entrypoint




The Flask app is defined in app.py and serves the legacy routes. It is the main orchestration layer.




### 10.2 Database abstraction




The database abstraction layer in backend/database/db.py routes requests to Supabase when available and falls back to SQLite for legacy tables. The abstraction is responsible for:




- table selection

- get-by-id loading

- inserts

- updates

- deletes

- count queries

- upsert semantics

- order normalization

- filter normalization

- JSON serialization/deserialization for SQLite




### 10.3 Repository layer




Repositories are the main data access objects for the legacy platform:




- ProductRepository handles products and product-related filters.

- RenewalRepository handles renewal queries.

- PipelineRepository handles opportunity queries and summary calculations.




### 10.4 Sync subsystem




The sync subsystem includes:




- GreenBookClient for transport and parsing

- GreenBookMapper for normalization

- SyncUpdater for upsert and change-tracking behavior

- RenewalEngine for renewal alerts

- OpportunityEngine for opportunity rows

- SyncEngine for orchestration

- SyncCheckpoint for progress tracking




### 10.5 Logging and utilities




Shared utilities support:




- safe text normalization

- timestamp formatting

- logging configuration




## 11. UI Design System (Extracted from the Repository)




### 11.1 Colour system




The legacy UI uses a restrained blue-and-neutral palette.




- Primary navy: #071a2f

- Primary blue: #0a4f79

- Background: #f4f7f9

- Border line: #e5e7eb

- Text primary: #172033

- Muted text: #667085

- Accent: #2f6f9f




### 11.2 Component colours




- Header background: #071a2f

- Header text: #ffffff

- Buttons: #0a4f79

- Secondary buttons: #ffffff with blue text and border

- Card backgrounds: #ffffff

- Table header background: #fafafa




### 11.3 Radius and spacing




- Card and section radius: 14px

- Input and button radius: 8px

- Main container width: min(1500px, calc(100% - 36px))

- Header padding: 22px 34px

- Main content margin: 28px auto

- Section padding: 20px

- Grid gap: 20px

- Card gap: 15px




### 11.4 Typography




- Font family: Arial, sans-serif

- Page title size: 32px

- Header brand size: 24px

- Body text: default browser size with the page stylesheet




### 11.5 Layout system




- Header with brand and nav links

- Main content centered in a wide container

- Cards and panels use white surfaces with borders

- Tables render with compact rows and a minimum width of 720px

- Grid layout uses equal-width columns for dashboard summaries and two-column layout for dashboard sections




### 11.6 Interactive styling




- Buttons elevate slightly on hover with a translateY and shadow transition

- Links are simple text links in the header

- Table rows are separated by subtle borders

- The UI is intentionally practical and desktop-first rather than playful




## 12. Component Library




### 12.1 Header




The shared header includes:




- brand title “MedNova OS”

- subtitle “NAFDAC Intelligence & Revenue Engine”

- nav links to core legacy pages




### 12.2 Buttons




Buttons are simple, rectangular, high-contrast controls with primary and secondary variants.




### 12.3 Forms




The legacy pages use simple forms built from standard HTML input and select elements.




### 12.4 Tables




The product, opportunities, renewals, and dashboard summary tables are the core reusable UI structure.




### 12.5 Cards




The dashboard uses cards for KPI summary values. The opportunities page uses detail cards for inline expanded information.




### 12.6 Drawer and toast




The opportunities page includes a report drawer and CRM success toast, both implemented in the template using custom CSS classes and JavaScript.




## 13. User Journey




A complete legacy-platform session typically includes:




1. User lands on the legacy dashboard.

2. User reviews counts and operational summaries.

3. User clicks Products to search the current portfolio.

4. User opens a product detail view to inspect its metadata.

5. User navigates to Renewals to review near-term expiry risk.

6. User opens Opportunities to review the commercial pipeline.

7. User triggers a Green Book sync from the dashboard or admin endpoint.

8. User reviews the resulting sync status and updates.

9. User leaves the system or repeats the workflow.




## 14. Technical Architecture




### 14.1 Folder structure




- app.py — Flask entrypoint and route definitions

- templates/ — server-rendered HTML templates

- static/ — CSS and other static assets

- backend/ — services, utils, sync logic, routes, and repositories

- backend/database/ — database abstraction and repositories

- backend/sync/ — Green Book ingestion, normalization, and opportunity/renewal logic

- database/ — schema, initialization, and migration scripts




### 14.2 Backend architecture




The backend is a server-rendered Flask application. Business logic is distributed across:




- route handlers in app.py

- repository classes in backend/database/repositories

- sync modules in backend/sync

- database abstraction in backend/database/db.py




### 14.3 Frontend architecture




The legacy frontend is not a modern SPA. It is a simple server-rendered HTML/CSS interface. The UI is composed of:




- Jinja templates under templates/

- shared base template in templates/base.html

- custom CSS in static/styles.css

- minimal JavaScript embedded into templates for interactive UI, such as expanding opportunity details and reporting drawers




### 14.4 Data flow




The core data flow is:




1. Green Book client fetches source records.

2. Mapper normalizes them.

3. Updater writes to the database.

4. Repositories expose data to the pages.

5. Templates render the page.




### 14.5 Repository pattern




The repository layer is used to abstract database access out of the views. ProductRepository, RenewalRepository, and PipelineRepository handle most legacy queries and normalization.




### 14.6 Service layer




The legacy system does not use a deep service layer in the same way as the later CRM layer. Most logic flows directly through route handlers and repositories, with the sync engine as the main domain processing unit.




### 14.7 Database abstraction




The abstraction layer supports both Supabase and SQLite. For the legacy product, the important behavior is that the system can run locally with SQLite when Supabase is not configured.




### 14.8 Caching and search




The platform uses search_cache and a lightweight repository-based search approach. Search is not a full-text engine; it relies on SQL-like filtering and string matching against known fields.




### 14.9 Sync engine




The sync engine is the central operational subsystem. It is responsible for data freshness, opportunity generation, renewal monitoring, and audit history.




## 15. Rebuild Notes for Loveable




To rebuild the legacy platform faithfully, the implementation should preserve the following:




- server-rendered Flask pages rather than a modern SPA

- the current route structure: dashboard, products, product detail, opportunities, renewals

- the current shared navigation and basic styling system

- the Green Book ingestion pipeline and sync lifecycle

- the product-centric data model with manufacturers, applicants, categories, routes, dosage forms, and products

- the renewal alert and opportunity generation rules

- the simple pagination and filter experience on the products and opportunities pages




The important principle is that the legacy platform was not a CRM product. It was a regulatory intelligence and commercial opportunity monitoring system whose core strength was Green Book ingestion, product lifecycle tracking, and operational visibility.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/85040b19-9f65-4c37-97f5-9c1cc145934c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
