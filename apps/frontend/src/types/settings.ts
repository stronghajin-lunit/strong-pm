export interface AiSettingItem {
  feature_key: string
  label: string
  model: string
  default_model: string
}

export interface AiSettingsResponse {
  settings: AiSettingItem[]
  available_models: string[]
}
