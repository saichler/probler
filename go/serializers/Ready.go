package serializers

import (
	"github.com/saichler/k8s_observer/go/types"
	"github.com/saichler/shared/go/share/interfaces"
	"strconv"
	"strings"
)

type Ready struct{}

func (this *Ready) Mode() interfaces.SerializerMode {
	return interfaces.STRING
}
func Marshal(any interface{}, r interfaces.IRegistry) ([]byte, error) {
	return nil, nil
}
func Unmarshal(data []byte, typ string, r interfaces.IRegistry) (interface{}, error) {
	str := string(data)
	index := strings.Index(str, "/")
	if index != -1 {
		c, _ := strconv.Atoi(str[:index])
		o, _ := strconv.Atoi(str[index+1:])
		return &types.ReadyState{Count: int32(c), Outof: int32(o)}, nil
	}
	return nil, nil
}
