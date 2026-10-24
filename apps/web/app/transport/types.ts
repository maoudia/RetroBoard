/** Transport adapters implement the application's BoardChannel port. */
export type {
  BoardChannel as BoardTransport,
  ChannelFactory as TransportFactory,
  ChannelHandlers as TransportHandlers,
  ConnectionStatus,
  Identity,
} from '@retroboard/application'
