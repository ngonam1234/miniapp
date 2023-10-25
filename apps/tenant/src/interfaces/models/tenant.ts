export interface ITenant {
    _id: string;
    id: string;
    code: string;
    name: string;
    description: string;
    address: string;
    phone: string;
    email: string;
    admin_id: string[];
    number_of_user: number;
    is_active: boolean;
    created_time: Date;
    services: string[];
    webconsent_url: string;
}
