export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ailments: {
        Row: {
          created_at: string
          date: string
          description: string
          id: string
          is_active: boolean
          player_id: string | null
          staff_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          description: string
          id?: string
          is_active?: boolean
          player_id?: string | null
          staff_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          description?: string
          id?: string
          is_active?: boolean
          player_id?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ailments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ailments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      anthropometry_datasets: {
        Row: {
          category_id: string | null
          column_order: string[]
          created_at: string
          data: Json
          id: string
          name: string
          organization_id: string | null
          season_id: string | null
          senior_category_id: string | null
          senior_season_id: string | null
        }
        Insert: {
          category_id?: string | null
          column_order: string[]
          created_at?: string
          data: Json
          id?: string
          name: string
          organization_id?: string | null
          season_id?: string | null
          senior_category_id?: string | null
          senior_season_id?: string | null
        }
        Update: {
          category_id?: string | null
          column_order?: string[]
          created_at?: string
          data?: Json
          id?: string
          name?: string
          organization_id?: string | null
          season_id?: string | null
          senior_category_id?: string | null
          senior_season_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anthropometry_datasets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anthropometry_datasets_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anthropometry_datasets_senior_category_id_fkey"
            columns: ["senior_category_id"]
            isOneToOne: false
            referencedRelation: "senior_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anthropometry_datasets_senior_season_id_fkey"
            columns: ["senior_season_id"]
            isOneToOne: false
            referencedRelation: "senior_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      body_pain_responses: {
        Row: {
          body_part: string
          created_at: string
          description: string | null
          id: string
          pain_level: number
          player_id: string | null
          staff_id: string | null
        }
        Insert: {
          body_part: string
          created_at?: string
          description?: string | null
          id?: string
          pain_level: number
          player_id?: string | null
          staff_id?: string | null
        }
        Update: {
          body_part?: string
          created_at?: string
          description?: string | null
          id?: string
          pain_level?: number
          player_id?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "body_pain_responses_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "body_pain_responses_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string | null
          season_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
          season_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_category_assignments: {
        Row: {
          category_id: string | null
          coach_id: string
          created_at: string
          id: string
          role: string
          senior_category_id: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          coach_id: string
          created_at?: string
          id?: string
          role?: string
          senior_category_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          coach_id?: string
          created_at?: string
          id?: string
          role?: string
          senior_category_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_category_assignments_senior_category_id_fkey"
            columns: ["senior_category_id"]
            isOneToOne: false
            referencedRelation: "senior_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_category_id"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_coach_id"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          age: string | null
          category_id: string | null
          created_at: string
          email: string | null
          id: string
          image_url: string | null
          name: string
          organization_id: string | null
          senior_category_id: string | null
          user_id: string | null
        }
        Insert: {
          age?: string | null
          category_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          image_url?: string | null
          name: string
          organization_id?: string | null
          senior_category_id?: string | null
          user_id?: string | null
        }
        Update: {
          age?: string | null
          category_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          image_url?: string | null
          name?: string
          organization_id?: string | null
          senior_category_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaches_senior_category_id_fkey"
            columns: ["senior_category_id"]
            isOneToOne: false
            referencedRelation: "senior_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      complementary_materials: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          material_type: string
          organization_id: string | null
          season_id: string
          senior_category_id: string | null
          senior_season_id: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
          youtube_url: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          material_type: string
          organization_id?: string | null
          season_id: string
          senior_category_id?: string | null
          senior_season_id?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          youtube_url?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          material_type?: string
          organization_id?: string | null
          season_id?: string
          senior_category_id?: string | null
          senior_season_id?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complementary_materials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complementary_materials_senior_category_id_fkey"
            columns: ["senior_category_id"]
            isOneToOne: false
            referencedRelation: "senior_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complementary_materials_senior_season_id_fkey"
            columns: ["senior_season_id"]
            isOneToOne: false
            referencedRelation: "senior_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          performance: string
          player_id: string | null
          score: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          performance: string
          player_id?: string | null
          score?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          performance?: string
          player_id?: string | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      force_datasets: {
        Row: {
          category_id: string | null
          column_order: string[]
          created_at: string
          data: Json
          id: string
          name: string
          organization_id: string | null
          season_id: string | null
          senior_category_id: string | null
          senior_season_id: string | null
          type: string
        }
        Insert: {
          category_id?: string | null
          column_order?: string[]
          created_at?: string
          data: Json
          id?: string
          name: string
          organization_id?: string | null
          season_id?: string | null
          senior_category_id?: string | null
          senior_season_id?: string | null
          type?: string
        }
        Update: {
          category_id?: string | null
          column_order?: string[]
          created_at?: string
          data?: Json
          id?: string
          name?: string
          organization_id?: string | null
          season_id?: string | null
          senior_category_id?: string | null
          senior_season_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "force_datasets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "force_datasets_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "force_datasets_senior_category_id_fkey"
            columns: ["senior_category_id"]
            isOneToOne: false
            referencedRelation: "senior_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "force_datasets_senior_season_id_fkey"
            columns: ["senior_season_id"]
            isOneToOne: false
            referencedRelation: "senior_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_datasets: {
        Row: {
          category_id: string | null
          column_order: string[]
          created_at: string
          data: Json
          date: string | null
          id: string
          name: string
          organization_id: string | null
          season_id: string | null
          senior_category_id: string | null
          senior_season_id: string | null
        }
        Insert: {
          category_id?: string | null
          column_order?: string[]
          created_at?: string
          data: Json
          date?: string | null
          id?: string
          name: string
          organization_id?: string | null
          season_id?: string | null
          senior_category_id?: string | null
          senior_season_id?: string | null
        }
        Update: {
          category_id?: string | null
          column_order?: string[]
          created_at?: string
          data?: Json
          date?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          season_id?: string | null
          senior_category_id?: string | null
          senior_season_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gps_datasets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_datasets_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_datasets_senior_category_id_fkey"
            columns: ["senior_category_id"]
            isOneToOne: false
            referencedRelation: "senior_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_datasets_senior_season_id_fkey"
            columns: ["senior_season_id"]
            isOneToOne: false
            referencedRelation: "senior_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      injury_records: {
        Row: {
          created_at: string
          date: string
          id: string
          injury_description: string
          is_active: boolean
          player_id: string | null
          recommended_treatment: string
          staff_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          injury_description: string
          is_active?: boolean
          player_id?: string | null
          recommended_treatment: string
          staff_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          injury_description?: string
          is_active?: boolean
          player_id?: string | null
          recommended_treatment?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "injury_records_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "injury_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      lineups: {
        Row: {
          created_at: string | null
          id: string
          match_id: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lineups_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_lineups: {
        Row: {
          created_at: string
          formation: string
          id: string
          match_comments: string | null
          match_id: string | null
          not_called: Json | null
          positions: Json | null
          substitutes: Json | null
          substitutions: Json | null
        }
        Insert: {
          created_at?: string
          formation: string
          id?: string
          match_comments?: string | null
          match_id?: string | null
          not_called?: Json | null
          positions?: Json | null
          substitutes?: Json | null
          substitutions?: Json | null
        }
        Update: {
          created_at?: string
          formation?: string
          id?: string
          match_comments?: string | null
          match_id?: string | null
          not_called?: Json | null
          positions?: Json | null
          substitutes?: Json | null
          substitutions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "match_lineups_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_statistics: {
        Row: {
          assists: number | null
          comments: string | null
          created_at: string
          crosses: number | null
          goal_types: Json | null
          goalkeeper_evaluation: Json | null
          goals: number | null
          id: string
          match_id: string | null
          match_position: string | null
          minutes_played: number | null
          player_id: string | null
          rating: number | null
          red_cards: number | null
          saves: number | null
          yellow_cards: number | null
        }
        Insert: {
          assists?: number | null
          comments?: string | null
          created_at?: string
          crosses?: number | null
          goal_types?: Json | null
          goalkeeper_evaluation?: Json | null
          goals?: number | null
          id?: string
          match_id?: string | null
          match_position?: string | null
          minutes_played?: number | null
          player_id?: string | null
          rating?: number | null
          red_cards?: number | null
          saves?: number | null
          yellow_cards?: number | null
        }
        Update: {
          assists?: number | null
          comments?: string | null
          created_at?: string
          crosses?: number | null
          goal_types?: Json | null
          goalkeeper_evaluation?: Json | null
          goals?: number | null
          id?: string
          match_id?: string | null
          match_position?: string | null
          minutes_played?: number | null
          player_id?: string | null
          rating?: number | null
          red_cards?: number | null
          saves?: number | null
          yellow_cards?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_statistics_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_statistics_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          category_id: string | null
          created_at: string
          date: string
          id: string
          location: string | null
          ohiggins_score: number | null
          opponent: string
          opponent_score: number | null
          organization_id: string | null
          result: string | null
          season_id: string | null
          senior_category_id: string | null
          senior_season_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          date: string
          id?: string
          location?: string | null
          ohiggins_score?: number | null
          opponent: string
          opponent_score?: number | null
          organization_id?: string | null
          result?: string | null
          season_id?: string | null
          senior_category_id?: string | null
          senior_season_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          date?: string
          id?: string
          location?: string | null
          ohiggins_score?: number | null
          opponent?: string
          opponent_score?: number | null
          organization_id?: string | null
          result?: string | null
          season_id?: string | null
          senior_category_id?: string | null
          senior_season_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_senior_category_id_fkey"
            columns: ["senior_category_id"]
            isOneToOne: false
            referencedRelation: "senior_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_senior_season_id_fkey"
            columns: ["senior_season_id"]
            isOneToOne: false
            referencedRelation: "senior_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string | null
          document_url: string
          file_size: number | null
          id: string
          player_id: string | null
          staff_id: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type?: string | null
          document_url: string
          file_size?: number | null
          id?: string
          player_id?: string | null
          staff_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string | null
          document_url?: string
          file_size?: number | null
          id?: string
          player_id?: string | null
          staff_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_documents_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_documents_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_configurations: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          accent_color: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      physical_evaluations: {
        Row: {
          created_at: string
          id: string
          season_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          season_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          season_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "physical_evaluations_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      player_category_assignments: {
        Row: {
          category_id: string | null
          created_at: string | null
          end_date: string | null
          id: string
          player_id: string
          season_id: string | null
          senior_category_id: string | null
          senior_season_id: string | null
          start_date: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          player_id: string
          season_id?: string | null
          senior_category_id?: string | null
          senior_season_id?: string | null
          start_date?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          player_id?: string
          season_id?: string | null
          senior_category_id?: string | null
          senior_season_id?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_category_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_category_assignments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_category_assignments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_category_assignments_senior_category_id_fkey"
            columns: ["senior_category_id"]
            isOneToOne: false
            referencedRelation: "senior_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_category_assignments_senior_season_id_fkey"
            columns: ["senior_season_id"]
            isOneToOne: false
            referencedRelation: "senior_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          age: number | null
          category_id: string | null
          created_at: string
          email: string | null
          first_surname: string | null
          height: string | null
          id: string
          image_url: string | null
          is_auth_enabled: boolean
          is_deleted: boolean
          jersey_number: string | null
          name: string
          organization_id: string | null
          position: string | null
          second_surname: string | null
          senior_category_id: string | null
          updated_at: string
          user_id: string | null
          weight: string | null
        }
        Insert: {
          age?: number | null
          category_id?: string | null
          created_at?: string
          email?: string | null
          first_surname?: string | null
          height?: string | null
          id?: string
          image_url?: string | null
          is_auth_enabled?: boolean
          is_deleted?: boolean
          jersey_number?: string | null
          name: string
          organization_id?: string | null
          position?: string | null
          second_surname?: string | null
          senior_category_id?: string | null
          updated_at?: string
          user_id?: string | null
          weight?: string | null
        }
        Update: {
          age?: number | null
          category_id?: string | null
          created_at?: string
          email?: string | null
          first_surname?: string | null
          height?: string | null
          id?: string
          image_url?: string | null
          is_auth_enabled?: boolean
          is_deleted?: boolean
          jersey_number?: string | null
          name?: string
          organization_id?: string | null
          position?: string | null
          second_surname?: string | null
          senior_category_id?: string | null
          updated_at?: string
          user_id?: string | null
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_senior_category_id_fkey"
            columns: ["senior_category_id"]
            isOneToOne: false
            referencedRelation: "senior_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string | null
          id: string
          match_id: string | null
          playerid: string | null
          x: number
          y: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id?: string | null
          playerid?: string | null
          x: number
          y: number
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string | null
          playerid?: string | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "positions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_playerid_fkey"
            columns: ["playerid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      psychological_documents: {
        Row: {
          created_at: string | null
          document_name: string
          document_type: string | null
          document_url: string
          file_size: number | null
          id: string
          player_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_name: string
          document_type?: string | null
          document_url: string
          file_size?: number | null
          id?: string
          player_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_name?: string
          document_type?: string | null
          document_url?: string
          file_size?: number | null
          id?: string
          player_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "psychological_documents_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      resistance_datasets: {
        Row: {
          category_id: string | null
          column_order: string[]
          created_at: string
          data: Json
          id: string
          name: string
          organization_id: string | null
          season_id: string | null
          senior_category_id: string | null
          senior_season_id: string | null
        }
        Insert: {
          category_id?: string | null
          column_order: string[]
          created_at?: string
          data: Json
          id?: string
          name: string
          organization_id?: string | null
          season_id?: string | null
          senior_category_id?: string | null
          senior_season_id?: string | null
        }
        Update: {
          category_id?: string | null
          column_order?: string[]
          created_at?: string
          data?: Json
          id?: string
          name?: string
          organization_id?: string | null
          season_id?: string | null
          senior_category_id?: string | null
          senior_season_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resistance_datasets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resistance_datasets_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resistance_datasets_senior_category_id_fkey"
            columns: ["senior_category_id"]
            isOneToOne: false
            referencedRelation: "senior_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resistance_datasets_senior_season_id_fkey"
            columns: ["senior_season_id"]
            isOneToOne: false
            referencedRelation: "senior_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      rpe_responses: {
        Row: {
          created_at: string
          id: string
          internal_load: number
          minutes: number
          player_id: string | null
          rpe_score: number
          staff_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          internal_load: number
          minutes: number
          player_id?: string | null
          rpe_score: number
          staff_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          internal_load?: number
          minutes?: number
          player_id?: string | null
          rpe_score?: number
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rpe_responses_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rpe_responses_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      senior_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string | null
          senior_season_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
          senior_season_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          senior_season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "senior_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "senior_categories_senior_season_id_fkey"
            columns: ["senior_season_id"]
            isOneToOne: false
            referencedRelation: "senior_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      senior_seasons: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "senior_seasons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      speed_datasets: {
        Row: {
          category_id: string | null
          column_order: string[]
          created_at: string
          data: Json
          id: string
          name: string
          organization_id: string | null
          season_id: string | null
          senior_category_id: string | null
          senior_season_id: string | null
        }
        Insert: {
          category_id?: string | null
          column_order: string[]
          created_at?: string
          data: Json
          id?: string
          name: string
          organization_id?: string | null
          season_id?: string | null
          senior_category_id?: string | null
          senior_season_id?: string | null
        }
        Update: {
          category_id?: string | null
          column_order?: string[]
          created_at?: string
          data?: Json
          id?: string
          name?: string
          organization_id?: string | null
          season_id?: string | null
          senior_category_id?: string | null
          senior_season_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "speed_datasets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speed_datasets_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speed_datasets_senior_category_id_fkey"
            columns: ["senior_category_id"]
            isOneToOne: false
            referencedRelation: "senior_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speed_datasets_senior_season_id_fkey"
            columns: ["senior_season_id"]
            isOneToOne: false
            referencedRelation: "senior_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          organization_id: string | null
          role: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          organization_id?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          organization_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      temp_users: {
        Row: {
          created_at: string | null
          email: string
          football_access: string | null
          id: string
          medical_players_access: string | null
          medical_staff_access: string | null
          password_hash: string
          physical_access: string | null
          processed: boolean | null
          staff_access: string | null
          youth_records_access: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          football_access?: string | null
          id?: string
          medical_players_access?: string | null
          medical_staff_access?: string | null
          password_hash: string
          physical_access?: string | null
          processed?: boolean | null
          staff_access?: string | null
          youth_records_access?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          football_access?: string | null
          id?: string
          medical_players_access?: string | null
          medical_staff_access?: string | null
          password_hash?: string
          physical_access?: string | null
          processed?: boolean | null
          staff_access?: string | null
          youth_records_access?: string | null
        }
        Relationships: []
      }
      user_group_memberships: {
        Row: {
          created_at: string
          created_by: string | null
          group_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          max_football_access: string
          max_medical_players_access: string
          max_medical_staff_access: string
          max_physical_access: string
          max_senior_football_access: string
          max_staff_access: string
          max_youth_records_access: string
          name: string
          organization_id: string | null
          parent_group_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_football_access?: string
          max_medical_players_access?: string
          max_medical_staff_access?: string
          max_physical_access?: string
          max_senior_football_access?: string
          max_staff_access?: string
          max_youth_records_access?: string
          name: string
          organization_id?: string | null
          parent_group_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_football_access?: string
          max_medical_players_access?: string
          max_medical_staff_access?: string
          max_physical_access?: string
          max_senior_football_access?: string
          max_staff_access?: string
          max_youth_records_access?: string
          name?: string
          organization_id?: string | null
          parent_group_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_groups_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          football_access: string | null
          id: string
          medical_players_access: string | null
          medical_staff_access: string | null
          organization_id: string | null
          password_hash: string | null
          physical_access: string | null
          primary_group_id: string | null
          senior_football_access: string | null
          staff_access: string | null
          updated_at: string | null
          youth_records_access: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          football_access?: string | null
          id: string
          medical_players_access?: string | null
          medical_staff_access?: string | null
          organization_id?: string | null
          password_hash?: string | null
          physical_access?: string | null
          primary_group_id?: string | null
          senior_football_access?: string | null
          staff_access?: string | null
          updated_at?: string | null
          youth_records_access?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          football_access?: string | null
          id?: string
          medical_players_access?: string | null
          medical_staff_access?: string | null
          organization_id?: string | null
          password_hash?: string | null
          physical_access?: string | null
          primary_group_id?: string | null
          senior_football_access?: string | null
          staff_access?: string | null
          updated_at?: string | null
          youth_records_access?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_primary_group_id_fkey"
            columns: ["primary_group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_responses: {
        Row: {
          created_at: string | null
          fatigue_level: number | null
          id: string
          muscle_soreness: number | null
          player_id: string | null
          response_date: string
          sleep_quality: number | null
          staff_id: string | null
          stress_level: number | null
        }
        Insert: {
          created_at?: string | null
          fatigue_level?: number | null
          id?: string
          muscle_soreness?: number | null
          player_id?: string | null
          response_date?: string
          sleep_quality?: number | null
          staff_id?: string | null
          stress_level?: number | null
        }
        Update: {
          created_at?: string | null
          fatigue_level?: number | null
          id?: string
          muscle_soreness?: number | null
          player_id?: string | null
          response_date?: string
          sleep_quality?: number | null
          staff_id?: string | null
          stress_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wellness_responses_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wellness_responses_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clean_player_image_url: {
        Args: { player_id: string }
        Returns: undefined
      }
      create_player_and_user: {
        Args: {
          p_age: number
          p_auth_user_id: string
          p_category_id: string
          p_email: string
          p_height: string
          p_image_url: string
          p_jersey_number: string
          p_name: string
          p_position: string
          p_senior_category_id: string
          p_weight: string
        }
        Returns: Json
      }
      create_user_with_permissions: {
        Args: {
          football: string
          medical_players: string
          medical_staff: string
          physical: string
          staff: string
          user_email: string
          user_password: string
          youth_records: string
        }
        Returns: boolean
      }
      delete_player_and_user: {
        Args: { player_id_param: string }
        Returns: Json
      }
      get_player_id_from_auth: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_organization_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_staff_access: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      handle_player_email_reuse: {
        Args: {
          p_age: number
          p_category_id: string
          p_email: string
          p_height: string
          p_image_url: string
          p_jersey_number: string
          p_name: string
          p_password?: string
          p_position: string
          p_senior_category_id: string
          p_weight: string
        }
        Returns: Json
      }
      process_temp_user: {
        Args: { temp_user_id: string }
        Returns: boolean
      }
      update_player_with_image: {
        Args: {
          p_age?: number
          p_category_id?: string
          p_email?: string
          p_height?: string
          p_image_url?: string
          p_jersey_number?: string
          p_name: string
          p_player_id: string
          p_position?: string
          p_senior_category_id?: string
          p_weight?: string
        }
        Returns: undefined
      }
      update_user_password: {
        Args: { plain_password: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "staff" | "coach" | "medical" | "physical"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "staff", "coach", "medical", "physical"],
    },
  },
} as const
