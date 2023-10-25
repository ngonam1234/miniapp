export function resolveValue(obj: object, path: string): unknown {
    const parts = path.split(".");
    for (const part of parts) {
        try {
            obj = Reflect.get(obj, part);
        } catch (error) {
            return undefined;
        }
    }
    return obj;
}
