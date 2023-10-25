import axios from "axios";
import { error, HttpError } from "app";
import { configs } from "../configs";

export async function getEmailGroup(group: string): Promise<string[]> {
    const url = `${configs.services.group.getUrl()}`;
    try {
        const res = await axios.get(`${url}api/v1/in/groups/${group}/members`);
        const emailGroup: string[] = [];
        for (let i = 0; i < res.data.length; i++) {
            const element = res.data[i];
            emailGroup.push(element.email);
        }
        return emailGroup;
    } catch (e) {
        throw new HttpError(error.service(url));
    }
}
