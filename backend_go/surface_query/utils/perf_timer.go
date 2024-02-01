package utils

import "time"

type PerfTimer struct {
	startTime time.Time
	lapTime   time.Time
}

func NewPerfTimer() *PerfTimer {
	now := time.Now()
	perfTimer := PerfTimer{startTime: now, lapTime: now}
	return &perfTimer
}

func (pt PerfTimer) Elapsed_s() float64 {
	return time.Since(pt.startTime).Seconds()
}

func (pt PerfTimer) Elapsed_ms() int64 {
	return time.Since(pt.startTime).Milliseconds()
}

func (pt *PerfTimer) Lap_s() float64 {
	elapsed := time.Since(pt.lapTime).Seconds()
	pt.lapTime = time.Now()
	return elapsed
}

func (pt *PerfTimer) Lap_ms() int64 {
	elapsed := time.Since(pt.lapTime).Milliseconds()
	pt.lapTime = time.Now()
	return elapsed
}
