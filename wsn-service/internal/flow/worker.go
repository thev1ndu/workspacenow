package flow

import (
	"context"
	"fmt"

	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
)

// RunWorker registers the interpreter workflow and its activities on the task queue and
// blocks until ctx ends; it is the -worker role of the same image.
func RunWorker(ctx context.Context, tc client.Client, taskQueue string, acts *Activities) error {
	if tc == nil {
		return fmt.Errorf("temporal client is not connected")
	}
	w := worker.New(tc, taskQueue, worker.Options{})
	w.RegisterWorkflow(ExecutionWorkflow)
	w.RegisterActivity(acts) // a pointer to a struct registers all its methods as activities
	errCh := make(chan error, 1)
	go func() { errCh <- w.Run(worker.InterruptCh()) }()
	select {
	case <-ctx.Done():
		w.Stop()
		return <-errCh
	case err := <-errCh:
		return err
	}
}
