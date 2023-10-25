import { ISla } from "../models/sla";

type ISlaResponseAssurance = NonNullable<ISla["response_assurance"]>;
type ISlaResolvingAssurance = NonNullable<ISla["resolving_assurance"]>;

export type FindMatchingSLAResBody = Omit<
    ISla,
    "response_assurance" | "resolving_assurance"
> & {
    response_assurance?: Omit<ISlaResponseAssurance, "overdue_time"> & {
        overdue_time?: string;
    };
    resolving_assurance?: Omit<ISlaResolvingAssurance, "overdue_time"> & {
        overdue_time?: string;
    };
};
