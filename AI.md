after set the mstrl api

kubectl -n workspacenow annotate es wsn-secrets force-sync="$(date +%s)" --overwrite
kubectl -n workspacenow delete pod -l app.kubernetes.io/name=wsn-ai-service