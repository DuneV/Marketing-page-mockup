// services\import-api\src\lib\pubsub.ts

import { PubSub } from "@google-cloud/pubsub"
export const pubsub = new PubSub()
export const topicName = process.env.PUBSUB_TOPIC!

export async function enqueueImport(importId: string) {
  await pubsub.topic(topicName).publishMessage({ json: { importId } })
}
