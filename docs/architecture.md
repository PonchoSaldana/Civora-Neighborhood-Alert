# Arquitectura Serverless — Civora

Diagrama de flujo end-to-end y componentes en AWS para Civora.

```mermaid
flowchart TD
  subgraph Client [Cliente PWA - React + Vite + TS]
    UI[PWA Liquid Glass]
    IDB[(IndexedDB Borradores)]
    SW[Service Worker Workbox]
  end

  subgraph CloudFrontS3 [Hosting Frontend]
    CF[Amazon CloudFront]
    S3Host[(S3 Hosting Privado)]
  end

  subgraph AuthCognito [Autenticación]
    COG[Amazon Cognito User Pool]
  end

  subgraph ApiEdge [API Gateway HTTP API]
    API[HTTP API + JWT Authorizer]
  end

  subgraph Compute [AWS Lambda]
    LPresign[Lambda Presign Upload]
    LCreate[Lambda Create Incident]
    LGet[Lambda Get Incidents / Me]
    LStatus[Lambda Update Status]
    LConfirm[Lambda Confirm Incident]
    LLink[Lambda Link Duplicate]
    LStep[Lambda Process Incident Step]
  end

  subgraph Storage [Datos y Evidencia]
    DDB[(DynamoDB Tabla Única CivoraIncidents)]
    S3Priv[(S3 Bucket Privado Evidencia)]
  end

  subgraph Orchestration [Orquestación]
    SFN[AWS Step Functions Standard]
  end

  CF --> S3Host
  UI --> COG
  UI --> IDB
  UI --> API
  API --> LPresign
  API --> LCreate
  API --> LGet
  API --> LStatus
  API --> LConfirm
  API --> LLink

  LPresign -. Presigned POST .-> S3Priv
  UI -. Carga directa .-> S3Priv

  LCreate --> DDB
  LCreate -->|StartExecution| SFN
  SFN --> LStep
  LStep --> S3Priv
  LStep --> DDB
  LStatus --> DDB
  LConfirm --> DDB
  LLink --> DDB
```

---

## Flujo de reporte con fotografía y Step Functions

1. **Autenticación:** El usuario autentica sesión con Amazon Cognito (User Pool con grupos `REPORTER`, `MANAGER`, `ADMIN`).
2. **Presigned URL:** El cliente solicita `POST /uploads/presign` pasando tipo MIME (JPEG/PNG/WebP) y peso (<= 5 MB). Lambda valida y retorna política presigned POST de S3 de 5 minutos con prefijo `uploads/{userSub}/`.
3. **Carga directa a S3:** El navegador sube el archivo directamente a S3 privado (sin pasar los bytes por Lambda ni API Gateway).
4. **Creación de reporte:** La PWA envía `POST /incidents` con los metadatos, la referencia `objectKey` y el header `Idempotency-Key`.
5. **Respuesta 202 y disparo:** Lambda guarda el registro preliminar en DynamoDB (`status=RECIBIDO`, `isProcessing=true`), arranca Step Functions Standard y responde **202 Accepted** con `incidentId` y `executionArn`.
6. **Validación y duplicados:** Step Functions ejecuta la tarea que corre `HeadObject` en S3 para verificar la foto, consulta DynamoDB y aplica el algoritmo determinista de duplicados con explicación. Actualiza DynamoDB y desactiva `isProcessing`.
7. **Lectura y visualización:** La PWA consulta `GET /incidents/{id}`, muestra el progreso en vivo y, una vez completado, despliega el reporte con fotos mediante URLs firmadas breves y candidatos a duplicados al gestor.

