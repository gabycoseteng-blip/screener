{
  "id": "e4fd61ae-ed1e-41e5-8b8d-0db09113515b",
  "prevId": "00000000-0000-0000-0000-000000000000",
  "version": "7",
  "dialect": "postgresql",
  "tables": {
    "public.ideas": {
      "name": "ideas",
      "schema": "",
      "columns": {
        "id": {
          "name": "id",
          "type": "serial",
          "primaryKey": true,
          "notNull": true
        },
        "date_found": {
          "name": "date_found",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        },
        "source_platform": {
          "name": "source_platform",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "source_id": {
          "name": "source_id",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "subreddit_or_list": {
          "name": "subreddit_or_list",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "author_handle": {
          "name": "author_handle",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "post_title": {
          "name": "post_title",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "post_body_excerpt": {
          "name": "post_body_excerpt",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "permalink": {
          "name": "permalink",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "primary_ticker": {
          "name": "primary_ticker",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "all_tickers": {
          "name": "all_tickers",
          "type": "jsonb",
          "primaryKey": false,
          "notNull": true,
          "default": "'[]'::jsonb"
        },
        "sector": {
          "name": "sector",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "industry": {
          "name": "industry",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "engagement_score": {
          "name": "engagement_score",
          "type": "integer",
          "primaryKey": false,
          "notNull": true,
          "default": 0
        },
        "ai_quality_score": {
          "name": "ai_quality_score",
          "type": "real",
          "primaryKey": false,
          "notNull": false
        },
        "ai_score_breakdown": {
          "name": "ai_score_breakdown",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "ai_thesis_summary": {
          "name": "ai_thesis_summary",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "ai_direction": {
          "name": "ai_direction",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "status": {
          "name": "status",
          "type": "text",
          "primaryKey": false,
          "notNull": true,
          "default": "'New'"
        },
        "price_at_found": {
          "name": "price_at_found",
          "type": "real",
          "primaryKey": false,
          "notNull": false
        },
        "fwd_returns": {
          "name": "fwd_returns",
          "type": "jsonb",
          "primaryKey": false,
          "notNull": false
        }
      },
      "indexes": {
        "ideas_source_unique": {
          "name": "ideas_source_unique",
          "columns": [
            {
              "expression": "source_platform",
              "isExpression": false,
              "asc": true,
              "nulls": "last"
            },
            {
              "expression": "source_id",
              "isExpression": false,
              "asc": true,
              "nulls": "last"
            }
          ],
          "isUnique": true,
          "concurrently": false,
          "method": "btree",
          "with": {}
        },
        "ideas_primary_ticker_idx": {
          "name": "ideas_primary_ticker_idx",
          "columns": [
            {
              "expression": "primary_ticker",
              "isExpression": false,
              "asc": true,
              "nulls": "last"
            }
          ],
          "isUnique": false,
          "concurrently": false,
          "method": "btree",
          "with": {}
        },
        "ideas_date_found_idx": {
          "name": "ideas_date_found_idx",
          "columns": [
            {
              "expression": "date_found",
              "isExpression": false,
              "asc": true,
              "nulls": "last"
            }
          ],
          "isUnique": false,
          "concurrently": false,
          "method": "btree",
          "with": {}
        }
      },
      "foreignKeys": {},
      "compositePrimaryKeys": {},
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {},
      "isRLSEnabled": false
    },
    "public.runs": {
      "name": "runs",
      "schema": "",
      "columns": {
        "id": {
          "name": "id",
          "type": "serial",
          "primaryKey": true,
          "notNull": true
        },
        "started_at": {
          "name": "started_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        },
        "finished_at": {
          "name": "finished_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": false
        },
        "status": {
          "name": "status",
          "type": "text",
          "primaryKey": false,
          "notNull": true,
          "default": "'running'"
        },
        "trigger": {
          "name": "trigger",
          "type": "text",
          "primaryKey": false,
          "notNull": true,
          "default": "'cron'"
        },
        "pulled": {
          "name": "pulled",
          "type": "integer",
          "primaryKey": false,
          "notNull": true,
          "default": 0
        },
        "prefiltered": {
          "name": "prefiltered",
          "type": "integer",
          "primaryKey": false,
          "notNull": true,
          "default": 0
        },
        "triaged": {
          "name": "triaged",
          "type": "integer",
          "primaryKey": false,
          "notNull": true,
          "default": 0
        },
        "scored": {
          "name": "scored",
          "type": "integer",
          "primaryKey": false,
          "notNull": true,
          "default": 0
        },
        "written": {
          "name": "written",
          "type": "integer",
          "primaryKey": false,
          "notNull": true,
          "default": 0
        },
        "llm_cost_usd": {
          "name": "llm_cost_usd",
          "type": "real",
          "primaryKey": false,
          "notNull": true,
          "default": 0
        },
        "error": {
          "name": "error",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "stats": {
          "name": "stats",
          "type": "jsonb",
          "primaryKey": false,
          "notNull": false
        }
      },
      "indexes": {},
      "foreignKeys": {},
      "compositePrimaryKeys": {},
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {},
      "isRLSEnabled": false
    },
    "public.seen_posts": {
      "name": "seen_posts",
      "schema": "",
      "columns": {
        "source_platform": {
          "name": "source_platform",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "source_id": {
          "name": "source_id",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "first_seen_at": {
          "name": "first_seen_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        },
        "decision": {
          "name": "decision",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "content_hash": {
          "name": "content_hash",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "idea_id": {
          "name": "idea_id",
          "type": "integer",
          "primaryKey": false,
          "notNull": false
        }
      },
      "indexes": {
        "seen_posts_content_hash_idx": {
          "name": "seen_posts_content_hash_idx",
          "columns": [
            {
              "expression": "content_hash",
              "isExpression": false,
              "asc": true,
              "nulls": "last"
            }
          ],
          "isUnique": false,
          "concurrently": false,
          "method": "btree",
          "with": {}
        }
      },
      "foreignKeys": {},
      "compositePrimaryKeys": {
        "seen_posts_source_platform_source_id_pk": {
          "name": "seen_posts_source_platform_source_id_pk",
          "columns": [
            "source_platform",
            "source_id"
          ]
        }
      },
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {},
      "isRLSEnabled": false
    }
  },
  "enums": {},
  "schemas": {},
  "sequences": {},
  "roles": {},
  "policies": {},
  "views": {},
  "_meta": {
    "columns": {},
    "schemas": {},
    "tables": {}
  }
}