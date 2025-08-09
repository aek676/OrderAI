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

async function main() {
    const establishment = await getEstablishmentData();
    if (!establishment) {
        console.error('❌ No se pudo obtener el establecimiento.');
        return;
    }

    const [schedule, products, menus] = await Promise.all([
        getScheduleEstablishment(establishment.id_establishment),
        getProductsEstablishment(establishment.id_establishment),
        getMenusEstablishment(establishment.id_establishment)
    ]);

    if (!schedule) {
        console.error('❌ No se pudo obtener el horario del establecimiento.');
        return;
    }

    if (!products) {
        console.error('❌ No se pudieron obtener los productos del establecimiento.');
        return;
    }

    if (!menus) {
        console.error('❌ No se pudieron obtener los menús del establecimiento.');
        return;
    }

    console.log('🏪 Datos del establecimiento:');
    console.log(`${establishment.id_establishment} - ${establishment.name}`);
    console.log(`📍 Dirección: ${establishment.address}`);
    console.log(`📞 Teléfono: ${establishment.phone_number}`);
    console.log(`Ratio de pedidos: ${establishment.order_ratio}`);
    console.log('🗓️ Horario:');
    schedule.forEach(day => {
        console.log(`  - ${day.name}: ${day.is_open ? 'Abierto' : 'Cerrado'}`);
        if (day.is_open && day.session_schedule) {
            day.session_schedule.forEach(session => {
                console.log(`    Horario: ${session.opening_time} - ${session.closing_time}`);
            });
        }
    });
    console.log('🛍️ Productos:');
    products.forEach(product => {
        console.log(`  - [${product.id_product}] ${product.name} (${product.category}): ${product.price} €`);
    });
    console.log('🍽️ Menús:');
    menus.forEach(menu => {
        console.log(`  - ${menu.name} (${JSON.stringify(menu.category_requirements)}): ${menu.price} €`);
        console.log('    Productos:');
        menu.menu_product.forEach(menuProduct => {
            console.log(`      - [${menuProduct.id_product}]`);
        });
    });
}

export { getEstablishmentData, getScheduleEstablishment, getProductsEstablishment, getMenusEstablishment };