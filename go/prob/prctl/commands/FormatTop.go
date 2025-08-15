package commands

import (
	"fmt"
	"github.com/saichler/l8types/go/types"
	"sort"
	"strings"
	"time"
)

func formatMemory(bytes uint64) string {
	if bytes >= 1024*1024*1024 {
		return fmt.Sprintf("%.1fG", float64(bytes)/(1024*1024*1024))
	} else if bytes >= 1024*1024 {
		return fmt.Sprintf("%.1fM", float64(bytes)/(1024*1024))
	} else if bytes >= 1024 {
		return fmt.Sprintf("%.1fK", float64(bytes)/1024)
	}
	return fmt.Sprintf("%dB", bytes)
}

func centerString(s string, width int) string {
	if len(s) >= width {
		return s
	}
	padding := width - len(s)
	leftPad := padding / 2
	rightPad := padding - leftPad
	return strings.Repeat(" ", leftPad) + s + strings.Repeat(" ", rightPad)
}

func FormatTop(top *types.Top) string {
	if top == nil || len(top.Healths) == 0 {
		return "No processes running"
	}

	var sb strings.Builder

	type processInfo struct {
		pid     string
		user    string
		virt    uint64
		res     uint64
		shr     uint64
		status  string
		cpu     float64
		mem     float64
		time    string
		command string
	}

	var processes []processInfo
	for key, health := range top.Healths {
		pid := strings.Split(key, "-")[0]

		user := "root"
		if len(health.Alias) > 8 {
			user = health.Alias[:8]
		} else if health.Alias != "" {
			user = health.Alias
		}

		var virt, res, shr uint64
		var cpu, mem float64
		if health.Stats != nil {
			virt = health.Stats.MemoryUsage
			res = health.Stats.MemoryUsage
			shr = health.Stats.MemoryUsage / 4
			cpu = health.Stats.CpuUsage
			mem = cpu / 10
		}

		var status string
		switch health.Status {
		case types.HealthState_Up:
			status = "R"
		case types.HealthState_Down:
			status = "T"
		default:
			status = "S"
		}

		var timeStr string
		if health.StartTime > 0 {
			startTime := time.Unix(0, health.StartTime*int64(time.Millisecond))
			uptime := time.Since(startTime)
			hours := int(uptime.Hours())
			minutes := int(uptime.Minutes()) % 60
			seconds := int(uptime.Seconds()) % 60
			timeStr = fmt.Sprintf("%02d:%02d:%02d", hours, minutes, seconds)
		} else {
			timeStr = "00:00:00"
		}

		command := health.Alias
		if command == "" {
			command = "unknown"
		}

		processes = append(processes, processInfo{
			pid:     pid,
			user:    user,
			virt:    virt,
			res:     res,
			shr:     shr,
			status:  status,
			cpu:     cpu,
			mem:     mem,
			time:    timeStr,
			command: command,
		})
	}

	sort.Slice(processes, func(i, j int) bool {
		return processes[i].cpu > processes[j].cpu
	})

	// Calculate summary stats
	totalTasks := len(top.Healths)
	running := 0
	sleeping := 0
	stopped := 0
	var totalCpu float64
	var totalMem uint64
	for _, health := range top.Healths {
		switch health.Status {
		case types.HealthState_Up:
			running++
		case types.HealthState_Down:
			stopped++
		default:
			sleeping++
		}
		if health.Stats != nil {
			totalCpu += health.Stats.CpuUsage
			totalMem += health.Stats.MemoryUsage
		}
	}

	// Calculate column widths
	maxCommandWidth := len("COMMAND")
	maxVirtWidth := len("VIRT")
	maxResWidth := len("RES")
	maxShrWidth := len("SHR")

	for _, proc := range processes {
		if len(proc.command) > maxCommandWidth {
			maxCommandWidth = len(proc.command)
		}
		virtStr := formatMemory(proc.virt)
		if len(virtStr) > maxVirtWidth {
			maxVirtWidth = len(virtStr)
		}
		resStr := formatMemory(proc.res)
		if len(resStr) > maxResWidth {
			maxResWidth = len(resStr)
		}
		shrStr := formatMemory(proc.shr)
		if len(shrStr) > maxShrWidth {
			maxShrWidth = len(shrStr)
		}
	}

	// Build output
	currentTime := time.Now().Format("15:04:05")
	sb.WriteString(fmt.Sprintf("top - %s up 0 days, %d users,  load average: 0.00, 0.00, 0.00\n",
		currentTime, len(top.Healths)))

	sb.WriteString(fmt.Sprintf("Tasks: %d total, %d running, %d sleeping, %d stopped, 0 zombie\n",
		totalTasks, running, sleeping, stopped))

	sb.WriteString(fmt.Sprintf("%%Cpu(s): %5.1f us,  0.0 sy,  0.0 ni, %5.1f id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st\n",
		totalCpu, 100.0-totalCpu))
	sb.WriteString(fmt.Sprintf("MiB Mem : %8.1f total,     0.0 free, %8.1f used,     0.0 buff/cache\n",
		float64(totalMem)/1024/1024, float64(totalMem)/1024/1024))
	sb.WriteString("MiB Swap:      0.0 total,      0.0 free,      0.0 used.      0.0 avail Mem\n")
	sb.WriteString("\n")

	// Print header with dynamic widths (centered when smaller than column width)
	headerFormat := fmt.Sprintf("%%-%ds  %%2s  %%2s  %%%ds  %%%ds  %%%ds  %%s  %%5s  %%5s  %%8s\n", 
		maxCommandWidth, maxVirtWidth, maxResWidth, maxShrWidth)
	sb.WriteString(fmt.Sprintf(headerFormat, 
		centerString("COMMAND", maxCommandWidth),
		centerString("PR", 2),
		centerString("NI", 2),
		centerString("VIRT", maxVirtWidth),
		centerString("RES", maxResWidth),
		centerString("SHR", maxShrWidth),
		"S",
		centerString("%CPU", 5),
		centerString("%MEM", 5),
		centerString("UP TIME", 8)))

	// Print separator line
	separatorFormat := fmt.Sprintf("%%-%ds  %%2s  %%2s  %%%ds  %%%ds  %%%ds  %%s  %%5s  %%5s  %%8s\n", 
		maxCommandWidth, maxVirtWidth, maxResWidth, maxShrWidth)
	sb.WriteString(fmt.Sprintf(separatorFormat, 
		strings.Repeat("-", maxCommandWidth), 
		"--", 
		"--", 
		strings.Repeat("-", maxVirtWidth), 
		strings.Repeat("-", maxResWidth), 
		strings.Repeat("-", maxShrWidth), 
		"-", 
		"-----", 
		"-----", 
		"--------"))

	// Print data with dynamic widths
	dataFormat := fmt.Sprintf("%%-%ds  20   0  %%%ds  %%%ds  %%%ds  %%s  %%5.1f  %%5.1f  %%8s\n", 
		maxCommandWidth, maxVirtWidth, maxResWidth, maxShrWidth)

	for _, proc := range processes {
		sb.WriteString(fmt.Sprintf(dataFormat,
			proc.command,
			formatMemory(proc.virt),
			formatMemory(proc.res),
			formatMemory(proc.shr),
			proc.status,
			proc.cpu,
			proc.mem,
			proc.time))
	}

	return sb.String()
}
