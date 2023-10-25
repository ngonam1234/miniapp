import axios from "axios";

let endpoint = "http://127.0.0.1:6803/api/v1/in/mail/send-tenten";
export const setEndpoint = (url: string) => {
    endpoint = url;
};
export async function sendMail({
    email,
    code,
    service_name,
    action_by,
    info,
}: {
    email?: string[];
    code: string;
    service_name: string;
    action_by: string;
    info: {
        IDTicket?: string;
        RequesterName?: string;
        Subject?: string;
        TicketLink?: string;
        GroupName?: string;
        Assignee?: string;
        Tech?: string;
    };
}): Promise<void> {
    return await axios.post(endpoint, {
        email: email,
        code: code,
        service_name: service_name,
        action_by: action_by,
        info: info,
    });
}
