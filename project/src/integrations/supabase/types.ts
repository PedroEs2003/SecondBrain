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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      deudas: {
        Row: {
          id: number
          persona: string
          monto: number
          tipo: string
          descripcion: string | null
          fecha: string | null
          pagada: boolean | null
          created_at: string | null
          payments: Json | null
        }
        Insert: {
          id?: number
          persona: string
          monto: number
          tipo: string
          descripcion?: string | null
          fecha?: string | null
          pagada?: boolean | null
          created_at?: string | null
          payments?: Json | null
        }
        Update: {
          id?: number
          persona?: string
          monto?: number
          tipo?: string
          descripcion?: string | null
          fecha?: string | null
          pagada?: boolean | null
          created_at?: string | null
          payments?: Json | null
        }
        Relationships: []
      }
      ejercicios: {
        Row: {
          id: number
          nombre: string
          grupo_muscular_id: number | null
          series_sugeridas: number | null
          repes_sugeridas: number | null
          created_at: string | null
        }
        Insert: {
          id?: number
          nombre: string
          grupo_muscular_id?: number | null
          series_sugeridas?: number | null
          repes_sugeridas?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          nombre?: string
          grupo_muscular_id?: number | null
          series_sugeridas?: number | null
          repes_sugeridas?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ejercicios_grupo_muscular_id_fkey"
            columns: ["grupo_muscular_id"]
            isOneToOne: false
            referencedRelation: "grupos_musculares"
            referencedColumns: ["id"]
          }
        ]
      }
      grupos_musculares: {
        Row: {
          id: number
          nombre: string
          icono: string
          orden: number
          created_at: string | null
        }
        Insert: {
          id?: number
          nombre: string
          icono: string
          orden?: number
          created_at?: string | null
        }
        Update: {
          id?: number
          nombre?: string
          icono?: string
          orden?: number
          created_at?: string | null
        }
        Relationships: []
      }
      logs_gym: {
        Row: {
          id: number
          ejercicio_id: number | null
          series: number
          repes: number
          peso_kg: number
          notas: string | null
          fecha: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          ejercicio_id?: number | null
          series: number
          repes: number
          peso_kg: number
          notas?: string | null
          fecha?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          ejercicio_id?: number | null
          series?: number
          repes?: number
          peso_kg?: number
          notas?: string | null
          fecha?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_gym_ejercicio_id_fkey"
            columns: ["ejercicio_id"]
            isOneToOne: false
            referencedRelation: "ejercicios"
            referencedColumns: ["id"]
          }
        ]
      }
      notas: {
        Row: {
          id: number
          titulo: string
          contenido: string | null
          etiquetas: string[] | null
          created_at: string | null
          updated_at: string | null
          pinned: boolean | null
          color_class: string | null
          note_color: string | null
          checklist: boolean | null
        }
        Insert: {
          id?: number
          titulo: string
          contenido?: string | null
          etiquetas?: string[] | null
          created_at?: string | null
          updated_at?: string | null
          pinned?: boolean | null
          color_class?: string | null
          note_color?: string | null
          checklist?: boolean | null
        }
        Update: {
          id?: number
          titulo?: string
          contenido?: string | null
          etiquetas?: string[] | null
          created_at?: string | null
          updated_at?: string | null
          pinned?: boolean | null
          color_class?: string | null
          note_color?: string | null
          checklist?: boolean | null
        }
        Relationships: []
      }
      recordatorios: {
        Row: {
          id: number
          texto: string
          fecha: string
          hora: string | null
          repetir: string
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: number
          texto: string
          fecha: string
          hora?: string | null
          repetir?: string
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          texto?: string
          fecha?: string
          hora?: string | null
          repetir?: string
          activo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      rutinas_diarias: {
        Row: {
          id: number
          hora_inicio: string
          hora_fin: string
          actividad: string
          icono: string
          notificacion_activa: boolean | null
          dias_semana: number[] | null
          color: string | null
          minutos_antes: number | null
          created_at: string | null
        }
        Insert: {
          id?: number
          hora_inicio: string
          hora_fin: string
          actividad: string
          icono?: string
          notificacion_activa?: boolean | null
          dias_semana?: number[] | null
          color?: string | null
          minutos_antes?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          hora_inicio?: string
          hora_fin?: string
          actividad?: string
          icono?: string
          notificacion_activa?: boolean | null
          dias_semana?: number[] | null
          color?: string | null
          minutos_antes?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      rutinas_ejercicios: {
        Row: {
          id: number
          rutina_id: number
          ejercicio_id: number
          series_sugeridas: number | null
          repes_sugeridas: number | null
          orden: number | null
          notas: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          rutina_id: number
          ejercicio_id: number
          series_sugeridas?: number | null
          repes_sugeridas?: number | null
          orden?: number | null
          notas?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          rutina_id?: number
          ejercicio_id?: number
          series_sugeridas?: number | null
          repes_sugeridas?: number | null
          orden?: number | null
          notas?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rutinas_ejercicios_rutina_id_fkey"
            columns: ["rutina_id"]
            isOneToOne: false
            referencedRelation: "rutinas_personalizadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutinas_ejercicios_ejercicio_id_fkey"
            columns: ["ejercicio_id"]
            isOneToOne: false
            referencedRelation: "ejercicios"
            referencedColumns: ["id"]
          }
        ]
      }
      rutinas_excepciones: {
        Row: {
          id: number
          rutina_id: number | null
          fecha: string
          tipo: string
          created_at: string | null
        }
        Insert: {
          id?: number
          rutina_id?: number | null
          fecha: string
          tipo: string
          created_at?: string | null
        }
        Update: {
          id?: number
          rutina_id?: number | null
          fecha?: string
          tipo?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rutinas_excepciones_rutina_id_fkey"
            columns: ["rutina_id"]
            isOneToOne: false
            referencedRelation: "rutinas_diarias"
            referencedColumns: ["id"]
          }
        ]
      }
      rutinas_personalizadas: {
        Row: {
          id: number
          user_id: string | null
          nombre: string
          descripcion: string | null
          color: string | null
          icono: string | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id?: string | null
          nombre: string
          descripcion?: string | null
          color?: string | null
          icono?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string | null
          nombre?: string
          descripcion?: string | null
          color?: string | null
          icono?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tareas: {
        Row: {
          id: number
          titulo: string
          descripcion: string | null
          fecha_limite: string | null
          completada: boolean | null
          prioridad: number | null
          category: string | null
          subtasks: Json | null
          created_at: string | null
        }
        Insert: {
          id?: number
          titulo: string
          descripcion?: string | null
          fecha_limite?: string | null
          completada?: boolean | null
          prioridad?: number | null
          category?: string | null
          subtasks?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: number
          titulo?: string
          descripcion?: string | null
          fecha_limite?: string | null
          completada?: boolean | null
          prioridad?: number | null
          category?: string | null
          subtasks?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      vista_ejercicios_stats: {
        Row: {
          id: number | null
          nombre: string | null
          grupo_muscular_id: number | null
          series_sugeridas: number | null
          repes_sugeridas: number | null
          grupo_muscular: string | null
          grupo_icono: string | null
          peso_maximo: number | null
          total_entrenamientos: number | null
          ultimo_peso: number | null
          ultima_fecha: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
