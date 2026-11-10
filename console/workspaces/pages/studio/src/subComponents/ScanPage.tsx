import { useCallback, useEffect, useRef, useState } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { Camera, Magnifier, Stop } from "@workspacenow/icons";
import jsQR from "jsqr";
import { useListRecords, useUpdateRecord } from "@workspacenow/api-client";
import { formatFieldValue, useReferenceLabels } from "@workspacenow/data";
import type { Entity, EntityRecord, ScanConfig } from "@workspacenow/types";
import { DetailList, SectionCard, TextInput, errorMessage, formatRelative } from "@workspacenow/views";

/** Frames are decoded at this width; plenty for a QR code held up to the camera, and cheap per frame. */
const DECODE_WIDTH = 480;

type CameraState = { kind: "off" } | { kind: "starting" } | { kind: "on" } | { kind: "error"; message: string };

/** Streams the device camera into a video element and reports each QR code it decodes while enabled. */
function useQrCamera(onCode: (code: string) => void, decoding: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>({ kind: "off" });
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef(0);
  // Read through refs so the frame loop always sees the latest callback and pause state.
  const onCodeRef = useRef(onCode);
  const decodingRef = useRef(decoding);
  onCodeRef.current = onCode;
  decodingRef.current = decoding;

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState({ kind: "off" });
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState({ kind: "error", message: "This browser cannot use the camera here. Camera access needs HTTPS or localhost; enter the code below instead." });
      return;
    }
    setState({ kind: "starting" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setState({ kind: "on" });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      const tick = () => {
        if (decodingRef.current && video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth) {
          canvas.width = DECODE_WIDTH;
          canvas.height = Math.round((video.videoHeight / video.videoWidth) * DECODE_WIDTH);
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
          if (code?.data) onCodeRef.current(code.data.trim());
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    } catch (error) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const denied = error instanceof DOMException && error.name === "NotAllowedError";
      setState({ kind: "error", message: denied ? "Camera access was blocked. Allow it in the browser's site settings, or enter the code below." : "No camera could be started. Enter the code below instead." });
    }
  }, []);

  // Release the camera when the page closes.
  useEffect(() => stop, [stop]);

  return { videoRef, state, start, stop };
}

type Outcome =
  | { kind: "updated"; code: string; record: EntityRecord }
  | { kind: "found"; code: string; record: EntityRecord; note?: string }
  | { kind: "missing"; code: string };

/**
 * A scan page: read a QR code with the camera (or type it), find the record it names, and, when the
 * page says so, record the scan on it, such as checking a ticket in. Records already past their
 * starting state are shown, not changed, so a cancelled or used ticket is never let in twice.
 */
export function ScanPage({ title, entity, scan }: { title: string; entity: Entity; scan: ScanConfig }) {
  const records = useListRecords({ entityName: entity.name });
  const labels = useReferenceLabels(entity);
  const updateRecord = useUpdateRecord();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [typed, setTyped] = useState("");

  const onScanField = scan.onScan ? entity.fields.find((f) => f.name === scan.onScan!.field) : undefined;
  const readOnly = entity.scope === "external";

  const handle = (code: string) => {
    if (!code || outcome || updateRecord.isPending) return;
    const record = records.data?.items.find((r) => (scan.matchField === "id" ? r.id : String(r.values[scan.matchField] ?? "")) === code);
    if (!record) return setOutcome({ kind: "missing", code });
    if (!scan.onScan || !onScanField || readOnly) return setOutcome({ kind: "found", code, record });
    const current = record.values[scan.onScan.field];
    if (current === scan.onScan.value) {
      return setOutcome({ kind: "found", code, record, note: `Already ${humanize(scan.onScan.value)} ${formatRelative(record.updatedAt)}.` });
    }
    // Only records still in their starting state are changed; anything else needs a person to look.
    if (onScanField.defaultValue !== undefined && current !== onScanField.defaultValue) {
      return setOutcome({ kind: "found", code, record, note: `${onScanField.label} is ${humanize(String(current))}, so it was not ${humanize(scan.onScan.value)}.` });
    }
    updateRecord.mutate(
      { entityName: entity.name, recordId: record.id, values: { ...record.values, [scan.onScan.field]: scan.onScan.value } },
      { onSuccess: (updated) => setOutcome({ kind: "updated", code, record: updated as EntityRecord }) },
    );
  };

  const camera = useQrCamera(handle, !outcome);
  const next = () => {
    setOutcome(null);
    setTyped("");
    updateRecord.reset();
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <SectionCard
        title={title}
        subtitle={scan.onScan ? `Scanning sets ${onScanField?.label.toLowerCase() ?? scan.onScan.field} to ${humanize(scan.onScan.value)}.` : `Scanning opens the matching ${entity.label.toLowerCase()}.`}
        actions={
          camera.state.kind === "on" ? (
            <Button size="sm" kind="secondary" onClick={camera.stop}>
              <Stop className="size-3.5" aria-hidden />
              Stop camera
            </Button>
          ) : (
            <Button size="sm" disabled={camera.state.kind === "starting"} onClick={() => void camera.start()}>
              <Camera className="size-3.5" aria-hidden />
              Start camera
            </Button>
          )
        }
      >
        <div className="grid gap-4">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-default">
            {/* Muted and inline so mobile browsers play the preview without going full screen. */}
            <video ref={camera.videoRef} muted playsInline aria-label="Camera preview" className={`size-full object-cover ${camera.state.kind === "on" ? "" : "hidden"}`} />
            {camera.state.kind === "on" ? (
              <div aria-hidden className="pointer-events-none absolute inset-0 m-auto aspect-square h-3/5 rounded-2xl border-2 border-accent/80" />
            ) : (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">
                {camera.state.kind === "error" ? camera.state.message : "Start the camera and hold a QR code inside the frame."}
              </div>
            )}
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              handle(typed.trim());
            }}
          >
            <div className="min-w-0 flex-1">
              <TextInput label="Or enter the code" value={typed} onChange={setTyped} placeholder={scan.matchField === "id" ? "TKT-1001" : undefined} />
            </div>
            <Button type="submit" kind="secondary" disabled={!typed.trim() || !!outcome}>
              <Magnifier className="size-4" aria-hidden />
              Look up
            </Button>
          </form>
        </div>
      </SectionCard>

      <SectionCard title="Result" subtitle={outcome ? `Code ${outcome.code}` : "Waiting for a code"}>
        <div aria-live="polite" className="grid gap-4">
          {!outcome && !updateRecord.isPending && <p className="text-sm text-muted">The {entity.label.toLowerCase()} you scan appears here.</p>}
          {updateRecord.isPending && <p className="text-sm text-muted">Recording the scan…</p>}
          {!!updateRecord.error && <ScanAlert status="danger" text={errorMessage(updateRecord.error)} />}
          {outcome?.kind === "missing" && <ScanAlert status="danger" text={`No ${entity.label.toLowerCase()} matches this code.`} />}
          {outcome?.kind === "updated" && <ScanAlert status="success" text={`${capitalize(humanize(scan.onScan!.value))}: ${summary(entity, outcome.record)}`} />}
          {outcome?.kind === "found" && outcome.note && <ScanAlert status="warning" text={outcome.note} />}
          {outcome && outcome.kind !== "missing" && (
            <DetailList
              columns={2}
              items={[
                { label: "Code", value: <span className="font-mono text-[13px]">{outcome.record.id}</span> },
                ...entity.fields.map((f) => ({ label: f.label, value: formatFieldValue(f, outcome.record.values[f.name], labels) })),
              ]}
            />
          )}
          {outcome && (
            <div>
              <Button onClick={next}>Scan next</Button>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function ScanAlert({ status, text }: { status: "success" | "warning" | "danger"; text: string }) {
  return (
    <InlineNotification
      kind={status === "danger" ? "error" : status}
      lowContrast
      hideCloseButton
      title={text}
    />
  );
}

const humanize = (value: string) => value.replace(/[-_]/g, " ");
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The first text field's value, the most recognisable thing about a record, e.g. a ticket holder's name. */
function summary(entity: Entity, record: EntityRecord): string {
  const field = entity.fields.find((f) => f.type === "string");
  return field ? String(record.values[field.name] ?? record.id) : record.id;
}
