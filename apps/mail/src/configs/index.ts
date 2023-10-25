import "dotenv/config";

export const configs = {
    service: "mail",
    environment: process.env.CA_MAIL_ENVIRONMENT || "dev",
    app: {
        prefix: "/api/v1",
        host: process.env.CA_MAIL_HOST_NAME || "0.0.0.0",
        port: process.env.CA_MAIL_PORT_NUMBER || "6803",
    },
    redis: {
        host: process.env.CA_MAIL_REDIS_HOST || "127.0.0.1",
        port: process.env.CA_MAIL_REDIS_PORT || "6380",
        username: process.env.CA_MAIL_REDIS_USERNAME || "",
        password: process.env.CA_MAIL_REDIS_PASSWORD || "",
    },
    mail: {
        user: process.env.CA_USER_MAIL_SERVER,
        pass: process.env.CA_PASS_MAIL_SERVER,
        host: process.env.CA_HOST_MAIL_SERVER,
        port: process.env.CA_PORT_MAIL_SERVER,
    },
    tenten: {
        url:
            process.env.CA_TENTEN_MAIL ||
            "https://app.emailpro.com.vn/api/sendmail/",
        cookie: process.env.CA_TENTEN_COOKIE,
        token: process.env.CA_TENTEN_FROM_TOKEN,
        from: process.env.CA_TENTEN_FROM_ADDRESS,
        reply: process.env.CA_TENTEN_REPLY_TO,
    },
    outlook: {
        host: process.env.CA_HOST_MAIL_SERVER_OUTLOOK,
        user: process.env.CA_USER_MAIL_SERVER_OUTLOOK,
        port: process.env.CA_PORT_MAIL_SERVER_OUTLOOK,
        grant_type: process.env.CA_MAIL_GRANT_TYPE,
        scope: process.env.CA_MAIL_SCOPE,
        client_id: process.env.CA_MAIL_CLIENT_ID,
        client_secret: process.env.CA_MAIL_CLIENT_SECRET,
        tenant_id: process.env.CA_MAIL_TENANT_ID,
        url_api: process.env.CA_MAIL_URL_GRAPH_URL,
        url_login: process.env.CA_MAIL_URL_GRAPH_API,
        user_id: process.env.CA_MAIL_USER_ID,
    },
    mongo: {
        mode: process.env.CA_MAIL_MONGO_MODE || "STANDALONE",
        replicaName: process.env.CA_MAIL_MONGO_REPLICA_NAME || "rs0",
        addresses: process.env.CA_MAIL_MONGO_ADDRESSES || "127.0.0.1:27001",
        username: process.env.CA_MAIL_MONGO_USERNAME || "root",
        password: process.env.CA_MAIL_MONGO_PASSWORD || "",
        authSource: process.env.CA_MAIL_MONGO_AUTHOR_SOURCE || "admin",
        dbName: process.env.CA_MAIL_MONGO_DB_NAME || "mail",
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
    log: {
        logFileEnabled: process.env.CA_MAIL_LOG_FILE_ENABLED || "false",
        folderLogsPath:
            process.env.CA_MAIL_FOLDER_LOGS_PATH || `${__dirname}/../../logs`,

        logstashEnabled: process.env.CA_MAIL_LOG_LOGSTASH_ENABLED || "false",
        logstashHost: process.env.CA_MAIL_LOG_LOGSTASH_HOST || "127.0.0.1",
        logstashPort: process.env.CA_MAIL_LOG_LOGSTASH_PORT || "50001",
        logstashProtocol: process.env.CA_MAIL_LOG_LOGSTASH_PROTOCOL || "udp",
    },
    services: {
        group: {
            prefix: process.env.CA_GROUP_SERVICE_PREFIX || "/",
            host: process.env.CA_GROUP_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_GROUP_SERVICE_PORT || "6801",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
    },
};

configs.mongo.checkDatabaseConfigs();
