/*
 * © 2025 Sharon Aicler (saichler@gmail.com)
 *
 * Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package commands

import (
	"bytes"
	"fmt"
	"sort"
	"strconv"
	"time"

	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/l8types/go/types/l8health"
	"github.com/saichler/l8web/go/web/client"
	health2 "github.com/saichler/l8bus/go/overlay/health"
	"golang.org/x/text/language"
	"golang.org/x/text/message"
)

func Top(rc *client.RestClient, resources ifs.IResources) {
	defer time.Sleep(time.Second)
	health := &l8health.L8Health{}
	resp, err := rc.GET("0/"+health2.ServiceName, "Top",
		"", "", health)
	if err != nil {
		resources.Logger().Error(err.Error())
		return
	}
	top, ok := resp.(*l8health.L8Top)
	if ok {
		fmt.Println(FormatTop(top))
	}
}

func buildTop(top *l8health.L8Top) string {

	points := make([]*l8health.L8Health, 0)
	for _, hp := range top.Healths {
		points = append(points, hp)
	}

	sort.Slice(points, func(i, j int) bool {
		if points[i].Stats == nil {
			return false
		} else if points[j].Stats == nil {
			return true
		}
		return points[i].Stats.MemoryUsage > points[j].Stats.MemoryUsage
	})

	alias := colOf("Alias")
	tx := colOf("Tx Messages")
	rx := colOf("Rx Messages")
	mem := colOf("Memory Usage")

	for _, v := range points {
		row := &Row{hp: v}
		alias.SetLen(row.Name())
		tx.SetLen(row.Tx())
		rx.SetLen(row.Rx())
		mem.SetLen(row.Mem())
	}

	buff := &bytes.Buffer{}
	buff.WriteString(" ")
	alias.writeString(alias.name, buff)
	tx.writeString(tx.name, buff)
	rx.writeString(rx.name, buff)
	buff.WriteString("\n")

	for _, v := range points {
		row := &Row{hp: v}
		buff.WriteString(" ")
		alias.writeString(row.Name(), buff)
		tx.writeNumber(row.Tx(), buff)
		rx.writeNumber(row.Rx(), buff)
		mem.writeNumber(row.Mem(), buff)
		buff.WriteString("\n")
	}
	return buff.String()
}

func colOf(name string) *Column {
	c := &Column{name: name, l: len(name)}
	return c
}

type Column struct {
	name string
	l    int
}

func (this *Column) SetLen(str string) {
	if this.l < len(str) {
		this.l = len(str)
	}
}

func (this *Column) writeString(str string, buff *bytes.Buffer) {
	buff.WriteString(str)
	for i := 0; i < this.l-len(str); i++ {
		buff.WriteString(" ")
	}
	buff.WriteString(" ")
}

func (this *Column) writeNumber(str string, buff *bytes.Buffer) {
	for i := 0; i < this.l-len(str); i++ {
		buff.WriteString(" ")
	}
	buff.WriteString(str)
	buff.WriteString(" ")
}

type Row struct {
	hp *l8health.L8Health
}

func (this *Row) Name() string {
	return this.hp.Alias
}

func (this *Row) Tx() string {
	if this.hp.Stats != nil {
		return toNumber(this.hp.Stats.TxMsgCount)
	}
	return ""
}

func (this *Row) Rx() string {
	if this.hp.Stats != nil {
		return toNumber(this.hp.Stats.RxMsgCount)
	}
	return ""
}

func (this *Row) Mem() string {
	if this.hp.Stats != nil {
		return toMemory(this.hp.Stats.MemoryUsage)
	}
	return ""
}

func toNumber(num int64) string {
	p := message.NewPrinter(language.English)
	return p.Sprintf("%v", num)
}

func toMemory(num uint64) string {
	g := toG(num)
	if g != "" {
		return g
	}
	m := toM(num)
	if m != "" {
		return m
	}
	k := toK(num)
	if k != "" {
		return k
	}
	return app(num, "b")
}

func app(num uint64, s string) string {
	buff := bytes.Buffer{}
	buff.WriteString(strconv.Itoa(int(num)))
	buff.WriteString(s)
	return buff.String()
}

func toK(num uint64) string {
	num = num / 1024
	if num == 0 {
		return ""
	}
	return app(num, "kb")
}

func toM(num uint64) string {
	num = num / (1024 * 1024)
	if num == 0 {
		return ""
	}
	return app(num, "mb")
}

func toG(num uint64) string {
	num = num / (1024 * 1024 * 1024)
	if num == 0 {
		return ""
	}
	return app(num, "gb")
}
