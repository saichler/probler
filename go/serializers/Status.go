package serializers

import (
	"strconv"
	"strings"

	"github.com/saichler/l8types/go/ifs"
	types2 "github.com/saichler/probler/go/types"
)

type Status struct{}

func (this *Status) Mode() ifs.SerializerMode {
	return ifs.STRING
}
func (this *Status) Marshal(any interface{}, r ifs.IResources) ([]byte, error) {
	return nil, nil
}
func (this *Status) Unmarshal(data []byte, r ifs.IResources) (interface{}, error) {
	str := string(data)
	index := strings.Index(str, "/")
	if index != -1 {
		c, _ := strconv.Atoi(str[:index])
		o, _ := strconv.Atoi(str[index+1:])
		return &types2.K8SPodStatus{}, nil
	}
	return nil, nil
}
