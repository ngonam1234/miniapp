export interface ITEmail {
    id: string;
    code: string;
    subject: string;
    content: string;
    created_time: Date;
    created_by: string;
    updated_time: Date;
    updated_by: string;
    params_content: object[];
    params_subject: object[];
    description: string;
}
