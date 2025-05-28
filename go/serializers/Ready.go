package serializers

import (
	"github.com/saichler/l8types/go/ifs"
	"github.com/saichler/probler/go/types"
	"strconv"
	"strings"
)

type Ready struct{}

func (this *Ready) Mode() ifs.SerializerMode {
	return ifs.STRING
}
func (this *Ready) Marshal(any interface{}, r ifs.IResources) ([]byte, error) {
	return nil, nil
}
func (this *Ready) Unmarshal(data []byte, r ifs.IResources) (interface{}, error) {
	str := string(data)
	index := strings.Index(str, "/")
	if index != -1 {
		c, _ := strconv.Atoi(str[:index])
		o, _ := strconv.Atoi(str[index+1:])
		return &types.ReadyState{Count: int32(c), Outof: int32(o)}, nil
	}
	return nil, nil
}
