# Facebook publishing

- Publisher interface in `@viralclip/providers`; `FacebookPublisherProvider` uses the Graph API video endpoint.
- Required env: META_ACCESS_TOKEN (long-lived page token) + META_PAGE_ID.
- Required permissions/token type (page access token with): pages_show_list, pages_manage_posts, publish_video, read_insights.
- Publishing is never automatic unless credentials are configured AND approval mode/policy allow it.
- `MockPublisherProvider` returns deterministic ids for tests.

