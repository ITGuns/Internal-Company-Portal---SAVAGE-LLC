import helmet from 'helmet'

interface SecurityHeadersOptions {
    nodeEnv: string
}

export function createSecurityHeadersMiddleware(options: SecurityHeadersOptions) {
    const isProduction = options.nodeEnv === 'production'

    return helmet({
        contentSecurityPolicy: {
            useDefaults: false,
            directives: {
                defaultSrc: ["'none'"],
                baseUri: ["'none'"],
                formAction: ["'none'"],
                frameAncestors: ["'none'"],
                imgSrc: ["'self'", 'data:'],
                scriptSrc: ["'none'"],
                styleSrc: ["'none'"],
                connectSrc: ["'self'"],
            },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: false,
        referrerPolicy: { policy: 'no-referrer' },
        strictTransportSecurity: isProduction
            ? {
                maxAge: 31536000,
                includeSubDomains: true,
            }
            : false,
        xFrameOptions: { action: 'deny' },
    })
}
