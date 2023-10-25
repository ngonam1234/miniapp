import "dotenv/config";

export const configs = {
    service: "request",
    environment: process.env.CA_REQUEST_ENVIRONMENT || "dev",
    email: {
        link: process.env.CA_REQUEST_LINK_TICKET_MAIL,
    },
    app: {
        prefix: "/api/v1",
        host: process.env.CA_REQUEST_HOST_NAME || "0.0.0.0",
        port: process.env.CA_REQUEST_PORT_NUMBER || "6806",
    },
    mongo: {
        mode: process.env.CA_REQUEST_MONGO_MODE || "STANDALONE",
        replicaName: process.env.CA_REQUEST_MONGO_REPLICA_NAME || "rs0",
        addresses: process.env.CA_REQUEST_MONGO_ADDRESSES || "127.0.0.1:27001",
        username: process.env.CA_REQUEST_MONGO_USERNAME || "root",
        password: process.env.CA_REQUEST_MONGO_PASSWORD || "",
        authSource: process.env.CA_REQUEST_MONGO_AUTHOR_SOURCE || "admin",
        dbName: process.env.CA_REQUEST_MONGO_DB_NAME || "tenant",
        templateUri:
            "mongodb://${username}:${password}@${addresses}/${dbName}" +
            "?retryWrites=false&w=majority&authSource=${authSource}" +
            "&serverSelectionTimeoutMS=5000&connectTimeoutMS=10000" +
            "&authMechanism=SCRAM-SHA-256",
        getUri: function (): string {
            let uri = this.templateUri;
            const password = encodeURIComponent(this.password);
            const username = encodeURIComponent(this.username);
            uri = uri.replace("${username}", username);
            uri = uri.replace("${password}", password);
            uri = uri.replace("${authSource}", this.authSource);
            uri = uri.replace("${dbName}", this.dbName);
            uri = uri.replace("${addresses}", this.addresses);
            if (this.mode === "REPLICA_SET") {
                uri = `${uri}&replicaSet=${this.replicaName}`;
            }
            return uri;
        },
        checkDatabaseConfigs: function (): void {
            if (this.mode !== "STANDALONE" && this.mode !== "REPLICA_SET") {
                throw new Error(
                    "Mongodb connection mode must be STANDALONE or REPLICA_SET"
                );
            }
            if (this.mode === "REPLICA_SET" && !this.replicaName) {
                throw new Error("Mongodb replica name must not be empty");
            }
        },
    },
    redis: {
        host: process.env.CA_REQUEST_REDIS_HOST || "127.0.0.1",
        port: process.env.CA_REQUEST_REDIS_PORT || "6379",
        username: process.env.CA_REQUEST_REDIS_USERNAME || "",
        password: process.env.CA_REQUEST_REDIS_PASSWORD || "",
    },
    keys: {
        public: process.env.CA_REQUEST_PUBLIC_KEY || "",
        checkPublicKey: function (): void {
            if (!this.public) {
                throw new Error("Missing public key in environment variable");
            }
        },
    },
    log: {
        logFileEnabled: process.env.CA_REQUEST_LOG_FILE_ENABLED || "false",
        folderLogsPath:
            process.env.CA_REQUEST_FOLDER_LOGS_PATH ||
            `${__dirname}/../../logs`,

        logstashEnabled: process.env.CA_REQUEST_LOG_LOGSTASH_ENABLED || "false",
        logstashHost: process.env.CA_REQUEST_LOG_LOGSTASH_HOST || "127.0.0.1",
        logstashPort: process.env.CA_REQUEST_LOG_LOGSTASH_PORT || "50001",
        logstashProtocol: process.env.CA_REQUEST_LOG_LOGSTASH_PROTOCOL || "udp",
    },
    services: {
        group: {
            prefix:
                process.env.CA_REQUEST_GROUP_SERVICE_PREFIX ||
                "/api/v1/in/groups",
            host:
                process.env.CA_REQUEST_GROUP_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_REQUEST_GROUP_SERVICE_PORT || "6801",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        identity: {
            prefix:
                process.env.CA_REQUEST_IDENTITY_SERVICE_PREFIX ||
                "/api/v1/in/identities",
            host:
                process.env.CA_REQUEST_IDENTITY_SERVICE_HOST ||
                "http://127.0.0.1",
            port: process.env.CA_REQUEST_IDENTITY_SERVICE_PORT || "6802",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        user: {
            prefix:
                process.env.CA_REQUEST_USER_SERVICE_PREFIX ||
                "/api/v1/in/users",
            host:
                process.env.CA_REQUEST_USER_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_REQUEST_USER_SERVICE_PORT || "6801",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        auto: {
            prefix:
                process.env.CA_REQUEST_AUTO_SERVICE_PREFIX || "/api/v1/in/auto",
            host:
                process.env.CA_REQUEST_AUTO_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_REQUEST_AUTO_SERVICE_PORT || "6810",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        service: {
            prefix:
                process.env.CA_REQUEST_SERVICE_SERVICE_PREFIX ||
                "/api/v1/in/services",
            host:
                process.env.CA_REQUEST_SERVICE_SERVICE_HOST ||
                "http://127.0.0.1",
            port: process.env.CA_REQUEST_SERVICE_SERVICE_PORT || "6804",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        file: {
            prefix:
                process.env.CA_REQUEST_FILE_SERVICE_PREFIX ||
                "/api/v1/in/files",
            host:
                process.env.CA_REQUEST_FILE_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_REQUEST_FILE_SERVICE_PORT || "6807",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        tenant: {
            prefix:
                process.env.CA_REQUEST_TENANT_SERVICE_PREFIX ||
                "/api/v1/in/tenants",
            host:
                process.env.CA_REQUEST_TENANT_SERVICE_HOST ||
                "http://127.0.0.1",
            port: process.env.CA_REQUEST_TENANT_SERVICE_PORT || "6804",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        department: {
            prefix:
                process.env.CA_REQUEST_TENANT_SERVICE_PREFIX ||
                "/api/v1/in/departments",
            host:
                process.env.CA_REQUEST_TENANT_SERVICE_HOST ||
                "http://127.0.0.1",
            port: process.env.CA_REQUEST_TENANT_SERVICE_PORT || "6804",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        sla: {
            prefix:
                process.env.CA_REQUEST_SLA_SERVICE_PREFIX || "/api/v1/in/slas",
            host: process.env.CA_REQUEST_SLA_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_REQUEST_SLA_SERVICE_PORT || "6812",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        incident: {
            prefix:
                process.env.CA_REQUEST_INCIDENT_SERVICE_PREFIX ||
                "/api/v1/in/incident",
            host:
                process.env.CA_REQUEST_INCIDENT_SERVICE_HOST ||
                "http://127.0.0.1",
            port: process.env.CA_REQUEST_INCIDENT_SERVICE_PORT || "6805",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        role: {
            prefix:
                process.env.CA_REQUEST_ROLE_SERVICE_PREFIX ||
                "/api/v1/in/roles",
            host:
                process.env.CA_REQUEST_ROLE_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_REQUEST_ROLE_SERVICE_PORT || "6813",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        mail: process.env.CA_REQUEST_MAIL_SERVICE_URL,
    },
    kafka: {
        broker: process.env.CA_REQUEST_KAFKA_BROKER || "http://127.0.0.1",
        topic: process.env.CA_REQUEST_KAFKA_TOPIC || "",
        username: process.env.CA_REQUEST_KAFKA_USERNAME || "",
        password: process.env.CA_REQUEST_KAFKA_PASSWORD || "",
    },
    validFieldsTicketImport: {
        status: JSON.parse(process.env.CA_REQUEST_IMPORT_TICKET_STATUS || "{}"),
        type: JSON.parse(process.env.CA_REQUEST_IMPORT_TICKET_TYPE || "{}"),
        channel: JSON.parse(
            process.env.CA_REQUEST_IMPORT_TICKET_CHANNEL || "{}"
        ),
        priority: JSON.parse(
            process.env.CA_REQUEST_IMPORT_TICKET_PRIORITY || "{}"
        ),
        group: JSON.parse(process.env.CA_REQUEST_IMPORT_TICKET_GROUP || "{}"),
        service: JSON.parse(
            process.env.CA_REQUEST_IMPORT_TICKET_SERVICE || "{}"
        ),
    },
};

configs.mongo.checkDatabaseConfigs();
configs.keys.checkPublicKey();
