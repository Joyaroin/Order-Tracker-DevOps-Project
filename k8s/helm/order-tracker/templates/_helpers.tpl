{{/*
Resolve the image reference for a service: imageRegistry/repository:tag
Falls back to the global imageTag if a per-service tag isn't set.
Usage: {{ include "ot.image" (dict "ctx" . "svc" .Values.orderApi) }}
*/}}
{{- define "ot.image" -}}
{{- $tag := default .ctx.Values.imageTag .svc.image.tag -}}
{{ .ctx.Values.imageRegistry }}/{{ .svc.image.repository }}:{{ $tag }}
{{- end -}}
