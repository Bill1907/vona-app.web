"use client";
import { useEffect, useRef, useState } from "react";
import { RealtimeClient } from "@openai/realtime-api-beta";
import { WavRecorder, WavStreamPlayer } from "@/lib/wavtools";
import { ItemType } from "@openai/realtime-api-beta/dist/lib/client.js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import dynamic from "next/dynamic";
import { Mic, MicOff, Loader2 } from "lucide-react";

// 클라이언트 사이드에서만 렌더링되도록 설정
const TalkPageContent = dynamic(() => Promise.resolve(TalkPageComponent), {
  ssr: false,
});

interface RealtimeEvent {
  time: string;
  source: "client" | "server";
  count?: number;
  event: { [key: string]: any };
}

function TalkPageComponent() {
  const relayServerUrl = process.env.NEXT_PUBLIC_RELAY_SERVER_URL;

  // 기본 인스턴스
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );

  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );

  const clientRef = useRef<RealtimeClient>(
    new RealtimeClient({ url: relayServerUrl })
  );

  // 상태 관리
  const [items, setItems] = useState<ItemType[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // VAD 관련 상태 추가
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModelResponding, setIsModelResponding] = useState(false);

  // Connect to conversation
  const connectConversation = async () => {
    try {
      setError(null);
      const client = clientRef.current;
      const wavRecorder = wavRecorderRef.current;
      const wavStreamPlayer = wavStreamPlayerRef.current;

      setIsConnected(true);
      setRealtimeEvents([]);
      setItems(client.conversation.getItems());

      try {
        await wavRecorder.begin();
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          setError(
            "마이크 접근이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요."
          );
          setIsConnected(false);
          return;
        }
        throw err;
      }

      await wavStreamPlayer.connect();
      await client.connect();

      console.log("client", client);

      // // VAD 설정 개선
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));

      client.sendUserMessageContent([
        {
          type: "input_text",
          text: "Hello!",
        },
      ]);
    } catch (err) {
      console.error("Connection error:", err);
      setError("연결 중 오류가 발생했습니다.");
      setIsConnected(false);
    }
  };

  // Disconnect conversation
  const disconnectConversation = async () => {
    try {
      setIsConnected(false);
      setRealtimeEvents([]);
      setItems([]);
      setError(null);
      setIsSpeaking(false);
      setIsProcessing(false);
      setIsModelResponding(false);

      const client = clientRef.current;
      client.disconnect();

      const wavRecorder = wavRecorderRef.current;
      await wavRecorder.end();

      const wavStreamPlayer = wavStreamPlayerRef.current;
      await wavStreamPlayer.interrupt();
    } catch (err) {
      console.error("Disconnect error:", err);
      setError("연결 해제 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const client = clientRef.current;

    // VAD 이벤트 핸들러 추가
    client.on("input_audio_buffer.speech_started", () => {
      setIsSpeaking(true);
      setIsProcessing(false);
    });

    client.on("input_audio_buffer.speech_stopped", () => {
      setIsSpeaking(false);
      setIsProcessing(true);
    });

    client.on("response.created", () => {
      setIsModelResponding(true);
      setIsProcessing(false);
    });

    client.on("response.done", () => {
      setIsModelResponding(false);
      setIsProcessing(false);
    });

    // 기존 이벤트 핸들러들
    client.on("realtime.event", (realtimeEvent: RealtimeEvent) => {
      setRealtimeEvents((realtimeEvents) => {
        const lastEvent = realtimeEvents[realtimeEvents.length - 1];
        if (lastEvent?.event.type === realtimeEvent.event.type) {
          lastEvent.count = (lastEvent.count || 0) + 1;
          return realtimeEvents.slice(0, -1).concat(lastEvent);
        } else {
          return realtimeEvents.concat(realtimeEvent);
        }
      });
    });

    client.on("error", (event: any) => {
      console.error(event);
      setError("오류가 발생했습니다.");
      setIsProcessing(false);
      setIsModelResponding(false);
    });

    client.on("conversation.interrupted", async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        client.cancelResponse(trackId, offset);
      }
    });

    client.on("conversation.updated", async ({ item, delta }: any) => {
      const items = client.conversation.getItems();
      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
      }
      if (item.status === "completed" && item.formatted.audio?.length) {
        const wavFile = WavRecorder.decode(item.formatted.audio, 24000, 24000);
        item.formatted.file = wavFile;
      }
      setItems(items);
    });

    setItems(client.conversation.getItems());

    return () => {
      client.reset();
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen p-4 space-y-4 items-center justify-center">
      <Card className="p-4 w-full max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Voice Chat</h1>
          <div className="flex space-x-2 items-center">
            {/* 상태 표시 아이콘 */}
            {isConnected && (
              <div className="flex items-center space-x-2 mr-4">
                {isSpeaking && <Mic className="h-5 w-5 text-green-500" />}
                {!isSpeaking && isConnected && (
                  <MicOff className="h-5 w-5 text-gray-500" />
                )}
                {isProcessing && (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                )}
                {isModelResponding && (
                  <div className="text-sm text-blue-500">AI 응답 중...</div>
                )}
              </div>
            )}
            <Button
              variant={isConnected ? "destructive" : "default"}
              onClick={
                isConnected ? disconnectConversation : connectConversation
              }
            >
              {isConnected ? "Disconnect" : "Connect"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-col space-y-4">
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {items.map((item) => (
              <Card
                key={item.id}
                className={`p-3 ${
                  item.role === "assistant" ? "bg-blue-50" : "bg-gray-50"
                }`}
              >
                <div className="font-semibold">
                  {item.role === "user" ? "You" : "Assistant"}
                </div>
                <div>
                  {item.formatted.transcript ||
                    item.formatted.text ||
                    "(processing...)"}
                </div>
                {item.formatted.file && (
                  <audio
                    src={item.formatted.file.url}
                    controls
                    className="mt-2"
                  />
                )}
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

// 메인 export를 TalkPageContent로 변경
export default function TalkPage() {
  return <TalkPageContent />;
}
