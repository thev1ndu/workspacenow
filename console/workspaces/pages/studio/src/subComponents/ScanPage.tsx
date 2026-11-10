import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Column, CodeSnippet, Grid, InlineNotification, Stack } from "@carbon/react";
import { Camera, Search, Stop } from "@carbon/react/icons";
import jsQR from "jsqr";
import { useListRecords, useUpdateRecord } from "@workspacenow/api-client";
import { formatFieldValue, useReferenceLabels } from "@workspacenow/data";
import type { Entity, EntityRecord, ScanConfig } from "@workspacenow/types";
import { DetailList, SectionCard, TextInput, errorMessage, formatRelative } from "@workspacenow/views";
import shared from "../shared.module.scss";

import styles from "./ScanPage.module.scss";

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
    <Grid narrow withRowGap>
      <Column sm={4} md={8} lg={8}>
        <SectionCard
          title={title}
          subtitle={scan.onScan ? `Scanning sets ${onScanField?.label.toLowerCase() ?? scan.onScan.field} to ${humanize(scan.onScan.value)}.` : `Scanning opens the matching ${entity.label.toLowerCase()}.`}
          actions={
            camera.state.kind === "on" ? (
              <Button size="sm" kind="secondary" renderIcon={Stop} onClick={camera.stop}>
                Stop camera
              </Button>
            ) : (
              <Button size="sm" renderIcon={Camera} disabled={camera.state.kind === "starting"} onClick={() => void camera.start()}>
                Start camera
              </Button>
            )
          }
        >
          <Stack gap={5}>
            <div className={styles.viewfinder}>
              <video ref={camera.videoRef} muted playsInline aria-label="Camera preview" className={`${styles.video} ${camera.state.kind === "on" ? "" : styles.hidden}`} />
              {camera.state.kind === "on" ? (
                <div aria-hidden className={styles.reticle} />
              ) : (
                <div className={styles.placeholder}>
                  {camera.state.kind === "error" ? camera.state.message : "Start the camera and hold a QR code inside the frame."}
                </div>
              )}
            </div>
            <form
              className={styles.lookup}
              onSubmit={(ev) => {
                ev.preventDefault();
                handle(typed.trim());
              }}
            >
              <div className={styles.lookupField}>
                <TextInput label="Or enter the code" value={typed} onChange={setTyped} placeholder={scan.matchField === "id" ? "TKT-1001" : undefined} />
              </div>
              <Button type="submit" kind="secondary" renderIcon={Search} disabled={!typed.trim() || !!outcome}>
                Look up
              </Button>
            </form>
          </Stack>
        </SectionCard>
      </Column>

      <Column sm={4} md={8} lg={8}>
        <SectionCard title="Result" subtitle={outcome ? `Code ${outcome.code}` : "Waiting for a code"}>
          <Stack gap={5} aria-live="polite">
            {!outcome && !updateRecord.isPending && <p className={shared.body}>The {entity.label.toLowerCase()} you scan appears here.</p>}
            {updateRecord.isPending && <p className={shared.body}>Recording the scan…</p>}
            {!!updateRecord.error && <ScanAlert status="danger" text={errorMessage(updateRecord.error)} />}
            {outcome?.kind === "missing" && <ScanAlert status="danger" text={`No ${entity.label.toLowerCase()} matches this code.`} />}
            {outcome?.kind === "updated" && <ScanAlert status="success" text={`${capitalize(humanize(scan.onScan!.value))}: ${summary(entity, outcome.record)}`} />}
            {outcome?.kind === "found" && outcome.note && <ScanAlert status="warning" text={outcome.note} />}
            {outcome && outcome.kind !== "missing" && (
              <DetailList
                columns={2}
                items={[
                  { label: "Code", value: <CodeSnippet type="inline" hideCopyButton>{outcome.record.id}</CodeSnippet> },
                  ...entity.fields.map((f) => ({ label: f.label, value: formatFieldValue(f, outcome.record.values[f.name], labels) })),
                ]}
              />
            )}
            {outcome && (
              <div>
                <Button onClick={next}>Scan next</Button>
              </div>
            )}
          </Stack>
        </SectionCard>
      </Column>
    </Grid>
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
