import { TypeEnum } from "./request.enum";

export interface IField {
    id: string;
    name: string;
    description: string;
    tenant?: string;
    title: string;
    type: TypeEnum;
    input_type: "COMBO_BOX" | "DATE_TIME";
    value_type: string;
    placeholder: string;
    is_active: boolean;
    datasource?: {
        href: string;
        dependencies: string[];
    };
}
