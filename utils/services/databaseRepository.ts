import supabase from '../supabase/client.js';

const getEstablishmentData = async (establishmentId: string = "c7831588-4953-40c5-bdcf-02809d8a2370"): Promise<EstablishmentData | null> => {
    const { data, error } = await supabase
        .from('establishments')
        .select()
        .eq('id_establishment', establishmentId)
        .single();

    if (error) {
        console.error('❌ Error al obtener los datos del establecimiento:', error);
        return null;
    }

    return data as EstablishmentData;
}

const getScheduleEstablishment = async (establishmentId: string): Promise<ScheduleData[] | null> => {
    const { data, error } = await supabase
        .from('days')
        .select(`
                id_day,
                name,
                is_open,
                session_schedule ( 
                    opening_time,
                    closing_time
                )
            `)
        .eq('id_establishment', establishmentId)
        .order('name')

    if (error) {
        console.error('❌ Error al obtener el horario del establecimiento:', error);
        return null;
    }

    return data as ScheduleData[];
}

const getProductsEstablishment = async (establishmentId: string): Promise<ProductData[] | null> => {
    const { data, error } = await supabase
        .from('products')
        .select()
        .eq('id_establishment', establishmentId);

    if (error) {
        console.error('❌ Error al obtener los productos del establecimiento:', error);
        return null;
    }

    return data as ProductData[];
}

const getMenusEstablishment = async (establishmentId: string): Promise<MenusData[] | null> => {
    const { data, error } = await supabase
        .from('menus')
        .select(`
            id_menu,
            name,
            price,
            description,
            category_requirements,
            menu_product (
                id_menu,
                id_product
            )
        `)
        .eq('id_establishment', establishmentId);

    if (error) {
        console.error('❌ Error al obtener los menús del establecimiento:', error);
        return null;
    }

    return data as MenusData[];
}

const getOrderWithDetailsOrder = async (orderId: string): Promise<OrderData & { details_order: DetailsOrder[] } | null> => {
    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            details_order (
                *
            )
        `)
        .eq('id_order', orderId)
        .single();

    if (error) {
        console.error('❌ Error al obtener la orden con detalles:', error);
        return null;
    }

    return data as OrderData & { details_order: DetailsOrder[] };
}

const getProduct = async (productId: string): Promise<ProductData | null> => {
    const { data, error } = await supabase
        .from('products')
        .select()
        .eq('id_product', productId)
        .single();

    if (error) {
        console.error('❌ Error al obtener el producto:', error);
        return null;
    }

    return data as ProductData;
}

const loadHistoryRows = async (idChat: string): Promise<MessageData[] | null> => {
    const { data, error } = await supabase
        .from('messages')
        .select()
        .eq('id_chat', idChat)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('❌ Error al cargar el historial de mensajes:', error);
        return null;
    }

    return data as MessageData[];
}

const insertOrder = async (order: OrderData): Promise<any> => {
    const { data, error, status } = await supabase
        .from('orders')
        .insert(order)
        .select();

    return { data, error, status };
}

const insertDetailsOrder = async (details: DetailsOrder): Promise<any> => {
    const { data, error, status } = await supabase
        .from('details_order')
        .insert(details)
        .select();

    return { data, error, status };
}

const saveMessage = async (message: MessageInsert) => {
    const { data, error } = await supabase
        .from('messages')
        .insert(message)
        .select();

    return { data, error };
}

export { getEstablishmentData, getScheduleEstablishment, getProductsEstablishment, getMenusEstablishment, insertOrder, insertDetailsOrder, saveMessage, loadHistoryRows, getOrderWithDetailsOrder };