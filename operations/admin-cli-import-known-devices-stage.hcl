job "admin-cli-import-known-devices-stage" {
  datacenters = [ "ator-fin" ]
  type = "batch"
  namespace = "stage-protocol"

  reschedule { attempts = 0 }

  group "admin-cli-import-known-devices-stage-group" {
    count = 1

    volume "anyone-protocol-hardware-manifests" {
      type      = "host"
      read_only = true
      source    = "anyone-protocol-hardware-manifests"
    }

    network { mode = "bridge" }

    task "admin-cli-import-known-devices-stage-task" {
      driver = "docker"
      config {
        image = "ghcr.io/anyone-protocol/admin-cli:[[.commit_sha]]"
        force_pull = true
        mount {
          type = "bind"
          target = "/etc/ssl/certs/vault-ca.crt"
          source = "/opt/nomad/tls/vault-ca.crt"
          readonly = true
          bind_options {
            propagation = "private"
          }
        }
        args = [
          "import-known-devices",
          "/usr/src/app/anyone-protocol-hardware-manifests/raw-manifest.json"
        ]
      }

      vault {
        role = "any1-nomad-workloads-controller"
      }

      identity {
        name = "vault_default"
        aud  = ["any1-infra"]
        ttl  = "1h"
      }

      template {
        data = <<-EOH
        {{- range service "validator-stage-mongo" }}
          MONGO_URI="mongodb://{{ .Address }}:{{ .Port }}/operator-registry-controller-stage-testnet"
        {{- end }}
        EOH
        destination = "local/config.env"
        env = true
      }

      volume_mount {
        volume = "anyone-protocol-hardware-manifests"
        destination = "/usr/src/app/anyone-protocol-hardware-manifests"
        read_only = true
      }

      resources {
        cpu    = 4096
        memory = 4096
      }

      restart {
        attempts = 0
        mode     = "fail"
      }
    }
  }
}
