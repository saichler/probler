package serializers

import (
	"strconv"
	"strings"

	"github.com/saichler/l8types/go/ifs"
	types2 "github.com/saichler/probler/go/types"
)

type Restarts struct{}

func (this *Restarts) Mode() ifs.SerializerMode {
	return ifs.STRING
}
func (this *Restarts) Marshal(any interface{}, r ifs.IResources) ([]byte, error) {
	return nil, nil
}
func (this *Restarts) Unmarshal(data []byte, r ifs.IResources) (interface{}, error) {
	str := string(data)
	index := strings.Index(str, "(")
	if index != -1 {
		c, _ := strconv.Atoi(strings.TrimSpace(str[:index]))
		a := strings.TrimSpace(str[index:])
		return &types2.K8SRestartsState{Count: int32(c), Ago: a}, nil
	}
	c, _ := strconv.Atoi(strings.TrimSpace(str))
	return &types2.K8SRestartsState{Count: int32(c), Ago: ""}, nil
}
