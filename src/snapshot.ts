// src/snapshot.ts
import {
    getEstablishmentData,
    getScheduleEstablishment,
    getProductsEstablishment,
    getMenusEstablishment,
} from '../utils/services/databaseRepository.js';

export type Snapshot = {
    id_establishment: string;
    name: string;
    address: string | null;
    phone: string | null;
    order_ratio: number | null;
    hours: Array<{ day: string; open: boolean; sessions?: Array<{ from: string; to: string }> }>;
    products: Array<{ id: string; name: string; category: string; price: number }>;
    products_index: Record<string, { name: string; category: string; price: number }>;
    menus: Array<{
        id: string; // id_menu real de BD
        name: string;
        price: number;
        description: string | null;
        composition: Record<string, number>;          // p.ej. { main:1, side:1, drink:1 }
        allowed_product_ids: string[];
        options_by_category: Record<string, Array<{ id: string; name: string }>>;
    }>;
    menus_index_by_id: Record<string, Snapshot['menus'][number]>;
    menus_index_by_name: Record<string, string>;
    updated_at: string;
};

export async function buildSnapshot(establishmentId: string): Promise<Snapshot> {
    const establishment = await getEstablishmentData(establishmentId);
    if (!establishment) throw new Error('Establecimiento no encontrado');

    const [schedule, products, menus] = await Promise.all([
        getScheduleEstablishment(establishment.id_establishment),
        getProductsEstablishment(establishment.id_establishment),
        getMenusEstablishment(establishment.id_establishment),
    ]);

    if (!schedule) throw new Error('Horario no disponible');
    if (!products) throw new Error('Productos no disponibles');
    if (!menus) throw new Error('Menús no disponibles');

    const hours = schedule.map((d) => ({
        day: d.name,
        open: !!d.is_open,
        ...(d.session_schedule?.length
            ? { sessions: d.session_schedule.map((s) => ({ from: s.opening_time, to: s.closing_time })) }
            : {}),
    }));

    const normalizedProducts = products.map((p) => ({
        id: p.id_product,
        name: p.name,
        category: p.category,
        price: Number(p.price),
    }));

    const products_index = normalizedProducts.reduce<Record<string, { name: string; category: string; price: number }>>(
        (acc, p) => {
            acc[p.id] = { name: p.name, category: p.category, price: p.price };
            return acc;
        },
        {},
    );

    const normalizedMenus = menus.map((m) => {
        const id_menu = (m as any).id_menu;
        if (!id_menu) throw new Error(`Menú sin id_menu en BD: "${m.name}". Incluye id_menu en la query.`);

        const composition = (m.category_requirements || {}) as Record<string, number>;
        const allowed = (m.menu_product || []).map((mp) => mp.id_product);

        const options_by_category: Record<string, Array<{ id: string; name: string }>> = {};
        for (const pid of allowed) {
            const prod = products_index[pid];
            if (!prod) continue;
            const cat = prod.category || 'other';
            if (!options_by_category[cat]) options_by_category[cat] = [];
            options_by_category[cat].push({ id: pid, name: prod.name });
        }

        return {
            id: id_menu, // ID REAL
            name: m.name,
            price: Number(m.price),
            description: m.description ?? null,
            composition,
            allowed_product_ids: allowed,
            options_by_category,
        };
    });

    const menus_index_by_id = normalizedMenus.reduce<Record<string, (typeof normalizedMenus)[number]>>(
        (acc, m) => (acc[m.id] = m, acc),
        {},
    );
    const menus_index_by_name = normalizedMenus.reduce<Record<string, string>>(
        (acc, m) => (acc[m.name.toLowerCase()] = m.id, acc),
        {},
    );

    return {
        id_establishment: establishment.id_establishment,
        name: establishment.name,
        address: establishment.address ?? null,
        phone: (establishment as any).phone_number ?? null,
        order_ratio: (establishment as any).order_ratio ?? null,
        hours,
        products: normalizedProducts,
        products_index,
        menus: normalizedMenus,
        menus_index_by_id,
        menus_index_by_name,
        updated_at: new Date().toISOString(),
    };
}
