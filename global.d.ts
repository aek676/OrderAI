import { Database } from "./types/database.types.js";

declare global {
    type EstablishmentData = Database['public']['Tables']['establishments']['Row'];
    type ScheduleData = Database['public']['Tables']['days']['Row'] & {
        session_schedule: Database['public']['Tables']['session_schedule']['Row'][]
    }
    type ProductData = Database['public']['Tables']['products']['Row'];
    type MenusData = Database['public']['Tables']['menus']['Row'] & {
        menu_product: Database['public']['Tables']['menu_product']['Row'][]
    };
    type OrderData = Database['public']['Tables']['orders']['Insert'];
    type DetailsOrder = Database['public']['Tables']['details_order']['Insert'];
}