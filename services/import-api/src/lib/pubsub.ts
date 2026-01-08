// services/import-api/src/lib/pubsub.ts
import { PubSub } from "@google-cloud/pubsub"

const pubsub = new PubSub()

export async function enqueueImport(importId: string) {
  const topicName = process.env.PUBSUB_TOPIC
  if (!topicName) {
    const err: any = new Error("Missing PUBSUB_TOPIC env var")
    err.status = 500
    throw err
  }

  const messageId = await pubsub
    .topic(topicName)
    .publishMessage({ json: { importId } })

  return { messageId }
}

